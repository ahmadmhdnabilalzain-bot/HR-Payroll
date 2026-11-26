import type { LeaveBalance, LeaveType, Period } from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { daysInPeriod, periodBounds } from "./days";

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

const int = (v: unknown) => Number(v ?? 0);

/**
 * Entitled = the type's company-entered annualDays (no accrual, no
 * first-six-months rule); remaining = entitled + adjustments - taken
 * - pending. Requests never cross a year, so a request belongs to the
 * year of its start date.
 */
export async function balanceFor(tx: Db, companyId: string,
  employeeId: string, leaveTypeId: string, year: number)
  : Promise<LeaveBalance> {
  const t = await loadLeaveType(tx, companyId, leaveTypeId);
  const [r] = await tx.query<{ taken: unknown; pending: unknown;
    adj: unknown }>(
    `SELECT
       (SELECT sum(days) FROM leave_requests WHERE company_id = $1
         AND employee_id = $2 AND leave_type_id = $3 AND status = 'approved'
         AND extract(year FROM start_date) = $4) AS taken,
       (SELECT sum(days) FROM leave_requests WHERE company_id = $1
         AND employee_id = $2 AND leave_type_id = $3 AND status = 'pending'
         AND extract(year FROM start_date) = $4) AS pending,
       (SELECT sum(days) FROM leave_adjustments WHERE company_id = $1
         AND employee_id = $2 AND leave_type_id = $3 AND year = $4) AS adj`,
    [companyId, employeeId, leaveTypeId, year]);
  const entitled = t.annual_days ?? 0;
  const [taken, pending, adj] = [int(r?.taken), int(r?.pending),
    int(r?.adj)];
  return { leaveTypeId, year, entitledDays: entitled, adjustmentDays: adj,
    takenDays: taken, pendingDays: pending,
    remainingDays: entitled + adj - taken - pending,
    dayCountRule: "calendar-days-inclusive" };
}

/** Days of approved leave of unpaid types inside the month. */
export async function unpaidLeaveDaysIn(tx: Db, companyId: string,
  employeeId: string, period: Period): Promise<number> {
  const { first, last } = periodBounds(period);
  const rows = await tx.query<{ start_date: string; end_date: string }>(
    `SELECT r.start_date, r.end_date FROM leave_requests r
     JOIN leave_types t ON t.company_id = r.company_id
       AND t.id = r.leave_type_id
     WHERE r.company_id = $1 AND r.employee_id = $2
       AND r.status = 'approved' AND NOT t.paid
       AND r.start_date <= $4 AND r.end_date >= $3`,
    [companyId, employeeId, first, last]);
  return rows.reduce((n, r) =>
    n + daysInPeriod(r.start_date, r.end_date, period), 0);
}
