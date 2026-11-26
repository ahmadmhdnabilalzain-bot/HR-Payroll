import type { LeaveBalance, LeaveType, Period } from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { periodBounds } from "./days";
import { policyBalance } from "./policy-balance";

interface TypeRow {
  id: string;
  name: string;
  name_ar: string | null;
  paid: boolean;
  annual_days: number | null;
}

export const toLeaveType = (r: TypeRow): LeaveType => ({ id: r.id,
  name: r.name, nameAr: r.name_ar, paid: r.paid,
  annualDays: r.annual_days });

export async function loadLeaveType(tx: Db, companyId: string, id: string)
  : Promise<TypeRow> {
  const [r] = await tx.query<TypeRow>(
    `SELECT id, name, name_ar, paid, annual_days FROM leave_types
     WHERE company_id = $1 AND id = $2`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function listLeaveTypes(tx: Db, companyId: string) {
  return tx.query<TypeRow>(
    `SELECT id, name, name_ar, paid, annual_days FROM leave_types
     WHERE company_id = $1 ORDER BY name, id`, [companyId]);
}

/**
 * The balance under the type's policy (Plan 9 `policyBalance`), as of
 * `asOf` (default: the year's last day; routes pass today in Dubai).
 * Plan 3's numbers are unchanged for a type without a policy.
 * Requests never cross a year: a request belongs to its start year.
 */
export async function balanceFor(tx: Db, companyId: string,
  employeeId: string, leaveTypeId: string, year: number,
  asOf = `${year}-12-31`): Promise<LeaveBalance> {
  const { availableHalves: _a, ...b } = await policyBalance(tx, companyId,
    employeeId, leaveTypeId, year, asOf);
  return b;
}

/**
 * Days of approved leave of unpaid types inside the month: the counted
 * half-days, rounded up, so a half day counts as 1 and the pay run
 * treats the month as partial (Plan 9 Ruling 9).
 */
export async function unpaidLeaveDaysIn(tx: Db, companyId: string,
  employeeId: string, period: Period): Promise<number> {
  const { first, last } = periodBounds(period);
  const [r] = await tx.query<{ halves: unknown }>(
    `SELECT sum(d.halves) AS halves FROM leave_request_dates d
     JOIN leave_requests r ON r.company_id = d.company_id
       AND r.id = d.request_id
     JOIN leave_types t ON t.company_id = r.company_id
       AND t.id = r.leave_type_id
     WHERE d.company_id = $1 AND r.employee_id = $2
       AND r.status = 'approved' AND NOT t.paid
       AND d.date BETWEEN $3 AND $4`,
    [companyId, employeeId, first, last]);
  return Math.ceil(Number(r?.halves ?? 0) / 2);
}
