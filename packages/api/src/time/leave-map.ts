import type { DayPart } from "@payroll/engine";
import type { Db } from "../db/db";

export interface LeaveOnDate {
  part: DayPart;
  halves: 1 | 2;
  requestId: string;
  leaveTypeId: string;
  status: "approved" | "pending";
}

/** employeeId to date to the leave on that date. */
export type LeaveMap = Map<string, Map<string, LeaveOnDate>>;

interface Row { request_id: string; employee_id: string;
  leave_type_id: string; date: string; halves: 1 | 2; part: DayPart;
  status: LeaveOnDate["status"] }

/** An `am` and a `pm` on one date combine into a full day. */
function merge(a: LeaveOnDate | undefined, b: LeaveOnDate): LeaveOnDate {
  if (a === undefined) return b;
  if (a.status === "approved" && b.status !== "approved") return a;
  if (b.status === "approved" && a.status !== "approved") return b;
  return { ...a, part: "full", halves: 2 };
}

/**
 * Leave per employee and counted date in [from, to]: approved
 * requests, and pending ones too when `withPending`. Dates come from
 * `leave_request_dates`, so half days and skipped days are exact.
 */
export async function leaveMap(tx: Db, companyId: string,
  employeeIds: readonly string[], from: string, to: string,
  withPending = false): Promise<LeaveMap> {
  const statuses = withPending ? ["approved", "pending"] : ["approved"];
  const rows = await tx.query<Row>(
    `SELECT d.request_id, r.employee_id, r.leave_type_id, d.date,
       d.halves, d.part, r.status FROM leave_request_dates d
     JOIN leave_requests r ON r.company_id = d.company_id
       AND r.id = d.request_id
     WHERE d.company_id = $1 AND r.employee_id = ANY($2::uuid[])
       AND r.status = ANY($3::text[]) AND d.date BETWEEN $4 AND $5
     ORDER BY d.date, d.request_id`,
    [companyId, employeeIds, statuses, from, to]);
  const out: LeaveMap = new Map();
  for (const r of rows) {
    const m = out.get(r.employee_id) ?? new Map<string, LeaveOnDate>();
    out.set(r.employee_id, m);
    m.set(r.date, merge(m.get(r.date), { part: r.part, halves: r.halves,
      requestId: r.request_id, leaveTypeId: r.leave_type_id,
      status: r.status }));
  }
  return out;
}
