import type { CarryOverResult } from "@payroll/contract";
import { carryOverHalves, daysInMonth } from "@payroll/engine";
import type { Db } from "../db/db";
import { timeParams } from "../time/params";
import { policyBalance } from "./policy-balance";

interface Stored { employee_id: string; leave_type_id: string;
  halves: number; excess_halves: number; expires_on: string | null }

const pad = (n: number) => String(n).padStart(2, "0");
/** Last day of month `months` of `year`, or null. */
const expiry = (year: number, months: number | null) => months === null
  ? null : `${year}-${pad(months)}-${pad(daysInMonth(year, months))}`;

/**
 * The stored rows; each row's warning is the engine's own, rebuilt
 * from the stored carried and excess halves.
 */
async function stored(tx: Db, companyId: string, toYear: number) {
  const rows = await tx.query<Stored>(
    `SELECT employee_id, leave_type_id, halves, excess_halves, expires_on
     FROM leave_carryovers WHERE company_id = $1 AND to_year = $2
     ORDER BY employee_id, leave_type_id`, [companyId, toYear]);
  const p = timeParams(`${toYear - 1}-12-31`);
  return rows.map((r) => ({ employeeId: r.employee_id,
    leaveTypeId: r.leave_type_id, days: r.halves / 2,
    expiresOn: r.expires_on, excessDays: r.excess_halves / 2,
    flags: carryOverHalves(r.halves + r.excess_halves, r.halves, p)
      .flags }));
}

/** Types with a carry-over cap, with cap (halves) and expiry months. */
async function cappedTypes(tx: Db, companyId: string) {
  return tx.query<{ leave_type_id: string; cap: number;
    months: number | null }>(
    `SELECT p.leave_type_id, p.carry_over_max_halves AS cap,
       p.carry_over_expires_months AS months FROM leave_policies p
     JOIN leave_types t ON t.company_id = p.company_id
       AND t.id = p.leave_type_id
     WHERE p.company_id = $1 AND p.carry_over_max_halves IS NOT NULL
       AND t.annual_days IS NOT NULL ORDER BY p.leave_type_id`,
    [companyId]);
}

/**
 * Once per company and year (a run row, `ON CONFLICT DO NOTHING`):
 * every employee and capped type carries `min(available at 31
 * December, cap)` into next year. A repeat returns the stored rows.
 */
export async function runCarryOver(tx: Db, companyId: string,
  fromYear: number, at: string): Promise<CarryOverResult> {
  const toYear = fromYear + 1;
  const fresh = await tx.query(
    `INSERT INTO leave_carryover_runs (company_id, from_year, created_at)
     VALUES ($1, $2, $3) ON CONFLICT (company_id, from_year) DO NOTHING
     RETURNING from_year`, [companyId, fromYear, at]);
  if (fresh.length === 0) {
    return { fromYear, toYear, rows: await stored(tx, companyId, toYear),
      alreadyRun: true };
  }
  const emps = await tx.query<{ id: string }>(
    `SELECT id FROM employees WHERE company_id = $1 AND joining_date <= $2
     ORDER BY id`, [companyId, `${fromYear}-12-31`]);
  for (const t of await cappedTypes(tx, companyId)) {
    for (const e of emps) {
      const b = await policyBalance(tx, companyId, e.id, t.leave_type_id,
        fromYear, `${fromYear}-12-31`);
      const c = carryOverHalves(b.availableHalves, t.cap,
        timeParams(`${fromYear}-12-31`));
      await tx.query(
        `INSERT INTO leave_carryovers (company_id, employee_id,
           leave_type_id, to_year, halves, excess_halves, expires_on,
           created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, e.id, t.leave_type_id, toYear, c.carriedHalves,
          c.excessHalves, expiry(toYear, t.months), at]);
    }
  }
  return { fromYear, toYear, rows: await stored(tx, companyId, toYear),
    alreadyRun: false };
}
