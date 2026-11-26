import type { DayPart } from "@payroll/engine";
import { addDays } from "@payroll/engine";
import type { Db } from "../db/db";

export interface LeaveOnDate {
  part: DayPart;
  requestId: string;
  leaveTypeId: string;
  status: "approved" | "pending";
}

/** employeeId to date to the leave on that date. */
export type LeaveMap = Map<string, Map<string, LeaveOnDate>>;

interface Row { id: string; employee_id: string; leave_type_id: string;
  start_date: string; end_date: string; status: LeaveOnDate["status"] }

function spread(out: LeaveMap, r: Row, from: string, to: string) {
  const m = out.get(r.employee_id) ?? new Map<string, LeaveOnDate>();
  out.set(r.employee_id, m);
  let d = r.start_date > from ? r.start_date : from;
  const end = r.end_date < to ? r.end_date : to;
  for (; d <= end; d = addDays(d, 1)) {
    m.set(d, { part: "full", requestId: r.id,
      leaveTypeId: r.leave_type_id, status: r.status });
  }
}

/**
 * Leave per employee and date in [from, to]: approved requests, and
 * pending ones too when `withPending`. Every date is a full day here.
 */
export async function leaveMap(tx: Db, companyId: string,
  employeeIds: readonly string[], from: string, to: string,
  withPending = false): Promise<LeaveMap> {
  const statuses = withPending ? ["approved", "pending"] : ["approved"];
  const rows = await tx.query<Row>(
    `SELECT id, employee_id, leave_type_id, start_date, end_date, status
     FROM leave_requests WHERE company_id = $1
     AND employee_id = ANY($2::uuid[]) AND status = ANY($3::text[])
     AND start_date <= $5 AND end_date >= $4 ORDER BY start_date, id`,
    [companyId, employeeIds, statuses, from, to]);
  const out: LeaveMap = new Map();
  for (const r of rows) spread(out, r, from, to);
  return out;
}
