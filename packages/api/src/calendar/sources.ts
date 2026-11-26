import type { FeedScope, Role } from "@payroll/contract";
import type { Db } from "../db/db";
import { inScope, viewerScope } from "../people/redact";
import type { FeedDeadline, FeedInput } from "./feed";

interface LeaveRow {
  id: string;
  employee_id: string;
  manager_id: string | null;
  full_name: string;
  type_name: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved";
}

export interface Viewer { role: Role; employeeId: string | null }

/** Pending and approved leave in range that the viewer's scope covers. */
async function leaveFor(tx: Db, c: string, v: Viewer, scope: FeedScope,
  from: string, to: string): Promise<FeedInput["leave"]> {
  if (scope === "company-deadlines") return [];
  const rows = await tx.query<LeaveRow>(
    `SELECT r.id, r.employee_id, e.manager_id, e.full_name,
       t.name AS type_name, r.start_date, r.end_date, r.status
     FROM leave_requests r
     JOIN employees e ON e.company_id = r.company_id AND e.id = r.employee_id
     JOIN leave_types t ON t.company_id = r.company_id
       AND t.id = r.leave_type_id
     WHERE r.company_id = $1 AND r.status IN ('pending', 'approved')
       AND r.start_date <= $3 AND r.end_date >= $2
     ORDER BY r.start_date, r.id`, [c, from, to]);
  const s = viewerScope(v);
  return rows.filter((r) => scope === "my" ? r.employee_id === v.employeeId
    : inScope(s, { id: r.employee_id, managerId: r.manager_id }))
    .map((r) => ({ id: r.id, employeeId: r.employee_id,
      employeeName: r.full_name, typeName: r.type_name,
      start: r.start_date, end: r.end_date, status: r.status }));
}

/**
 * Holidays (Plan 9) and deadlines (Plan 11) are not on this branch:
 * these seams return none until those plans are merged, and the feed
 * text is tested with fixtures meanwhile.
 */
export async function holidaysFor(_tx: Db, _c: string, _from: string,
  _to: string): Promise<FeedInput["holidays"]> {
  return [];
}

export async function deadlinesFor(_tx: Db, _c: string, _from: string,
  _to: string): Promise<FeedDeadline[]> {
  return [];
}

export async function feedInput(tx: Db, c: string, v: Viewer,
  scope: FeedScope, from: string, to: string): Promise<FeedInput> {
  return { scope, viewerEmployeeId: v.employeeId,
    leave: await leaveFor(tx, c, v, scope, from, to),
    holidays: scope === "company-deadlines" ? []
      : await holidaysFor(tx, c, from, to),
    deadlines: scope === "company-deadlines"
      ? await deadlinesFor(tx, c, from, to) : [] };
}
