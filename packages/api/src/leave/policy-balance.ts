import type { LeaveBalance } from "@payroll/contract";
import { accruedHalves, balanceHalves } from "@payroll/engine";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { loadLeaveType } from "./balances";
import { loadPolicy } from "./policy";

const num = (v: unknown) => Number(v ?? 0);

async function joiningDate(tx: Db, companyId: string, employeeId: string) {
  const [e] = await tx.query<{ joining_date: string }>(
    "SELECT joining_date FROM employees WHERE company_id = $1 AND id = $2",
    [companyId, employeeId]);
  if (e === undefined) throw new ApiError("NOT_FOUND");
  return e.joining_date;
}

async function counts(tx: Db, companyId: string, employeeId: string,
  typeId: string, year: number) {
  const taken = await tx.query<{ date: string; halves: number }>(
    `SELECT d.date, d.halves FROM leave_request_dates d
     JOIN leave_requests r ON r.company_id = d.company_id
       AND r.id = d.request_id
     WHERE d.company_id = $1 AND r.employee_id = $2
       AND r.leave_type_id = $3 AND r.status = 'approved'
       AND extract(year FROM r.start_date) = $4 ORDER BY d.date`,
    [companyId, employeeId, typeId, year]);
  const [r] = await tx.query<{ pending: unknown; adj: unknown }>(
    `SELECT (SELECT sum(half_units) FROM leave_requests WHERE
       company_id = $1 AND employee_id = $2 AND leave_type_id = $3
       AND status = 'pending' AND extract(year FROM start_date) = $4)
       AS pending,
     (SELECT sum(days) FROM leave_adjustments WHERE company_id = $1
       AND employee_id = $2 AND leave_type_id = $3 AND year = $4) AS adj`,
    [companyId, employeeId, typeId, year]);
  const [c] = await tx.query<{ halves: number; expires_on: string |
    null }>(`SELECT halves, expires_on FROM leave_carryovers
    WHERE company_id = $1 AND employee_id = $2 AND leave_type_id = $3
    AND to_year = $4`, [companyId, employeeId, typeId, year]);
  return { taken, pending: num(r?.pending), adjDays: num(r?.adj),
    carried: c?.halves ?? 0, expiresOn: c?.expires_on ?? null };
}

/**
 * A kept balance under the type's policy, as of `asOf`, in half-day
 * steps: accrued (engine) + carried - expired + adjustments - taken -
 * pending. Carried days are used first (engine convention).
 */
export async function policyBalance(tx: Db, companyId: string,
  employeeId: string, leaveTypeId: string, year: number, asOf: string)
  : Promise<LeaveBalance & { availableHalves: number }> {
  const t = await loadLeaveType(tx, companyId, leaveTypeId);
  const p = await loadPolicy(tx, companyId, leaveTypeId, asOf);
  const c = await counts(tx, companyId, employeeId, leaveTypeId, year);
  const annual = t.annual_days ?? 0;
  const accrued = accruedHalves({ accrual: p.accrual, annualDays: annual,
    joiningYearProRata: p.joiningYearProRata },
  await joiningDate(tx, companyId, employeeId), year, asOf);
  const b = balanceHalves({ accruedHalves: accrued,
    carriedHalves: c.carried, carriedExpiresOn: c.expiresOn,
    adjustmentHalves: c.adjDays * 2, taken: c.taken,
    pendingHalves: c.pending, asOf });
  return { leaveTypeId, year, entitledDays: annual,
    adjustmentDays: c.adjDays, takenDays: b.takenHalves / 2,
    pendingDays: c.pending / 2, remainingDays: b.availableHalves / 2,
    dayCountRule: p.dayCount === "working" ? "working-days"
      : "calendar-days-inclusive",
    accrual: p.accrual, accruedToDate: accrued / 2,
    carriedDays: c.carried / 2, carriedExpiresOn: c.expiresOn,
    expiredDays: b.expiredHalves / 2, availableHalves: b.availableHalves };
}
