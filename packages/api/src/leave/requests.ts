import type {
  LeaveRequest,
  LeaveRequestCreate,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { Tenant } from "../auth/guard";
import { ApiError } from "../http/errors";
import { inScope, viewerScope } from "../people/redact";
import { balanceFor, loadLeaveType } from "./balances";
import { leaveDays } from "./days";

export interface RequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveRequest["status"];
  reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
}

export const toLeaveRequest = (r: RequestRow): LeaveRequest => ({
  id: r.id, employeeId: r.employee_id, leaveTypeId: r.leave_type_id,
  startDate: r.start_date, endDate: r.end_date, days: r.days,
  status: r.status, reason: r.reason, decidedBy: r.decided_by,
  decidedAt: r.decided_at });

/** The employee's id and manager, for scope checks; 404 when absent. */
export async function employeeRef(tx: Db, companyId: string, id: string) {
  const [e] = await tx.query<{ id: string; manager_id: string | null }>(
    "SELECT id, manager_id FROM employees WHERE company_id = $1 AND id = $2",
    [companyId, id]);
  if (e === undefined) throw new ApiError("NOT_FOUND");
  return { id: e.id, managerId: e.manager_id };
}

export async function loadRequest(tx: Db, companyId: string, id: string,
  lock = false): Promise<RequestRow> {
  const [r] = await tx.query<RequestRow>(
    `SELECT * FROM leave_requests WHERE company_id = $1 AND id = $2
     ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** Whose request: self by default; an employee may not name another. */
async function subject(tx: Db, t: Tenant, b: LeaveRequestCreate) {
  const id = b.employeeId ?? t.employeeId;
  if (id === null) throw new ApiError("NO_EMPLOYEE_LINK");
  if (t.role === "employee" && id !== t.employeeId) {
    throw new ApiError("FORBIDDEN");
  }
  const ref = await employeeRef(tx, t.companyId, id);
  if (!inScope(viewerScope(t), ref)) throw new ApiError("NOT_FOUND");
  return id;
}

async function checkDates(tx: Db, companyId: string, employeeId: string,
  b: LeaveRequestCreate): Promise<number> {
  if (b.endDate < b.startDate) {
    throw new ApiError("VALIDATION_FAILED", "endDate is before startDate",
      { fields: ["body.endDate"] });
  }
  if (b.startDate.slice(0, 4) !== b.endDate.slice(0, 4)) {
    throw new ApiError("LEAVE_CROSSES_YEAR");
  }
  // Lock the employee row: parallel requests for one person queue.
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [companyId, employeeId]);
  const overlap = await tx.query(
    `SELECT 1 FROM leave_requests WHERE company_id = $1
     AND employee_id = $2 AND status IN ('pending', 'approved')
     AND start_date <= $4 AND end_date >= $3`,
    [companyId, employeeId, b.startDate, b.endDate]);
  if (overlap.length > 0) throw new ApiError("LEAVE_OVERLAP");
  return leaveDays(b.startDate, b.endDate);
}

export async function createRequest(tx: Db, t: Tenant, userId: string,
  ids: { id: string; at: string }, b: LeaveRequestCreate) {
  const employeeId = await subject(tx, t, b);
  const type = await loadLeaveType(tx, t.companyId, b.leaveTypeId);
  const days = await checkDates(tx, t.companyId, employeeId, b);
  if (type.annual_days !== null) {
    const bal = await balanceFor(tx, t.companyId, employeeId, type.id,
      Number(b.startDate.slice(0, 4)));
    if (bal.remainingDays < days) throw new ApiError("INSUFFICIENT_BALANCE");
  }
  await tx.query(
    `INSERT INTO leave_requests (id, company_id, employee_id, leave_type_id,
       start_date, end_date, days, status, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)`,
    [ids.id, t.companyId, employeeId, type.id, b.startDate, b.endDate,
      days, b.reason ?? null, userId, ids.at]);
  return loadRequest(tx, t.companyId, ids.id);
}

/** Approve or reject: pending only; a manager only for direct reports
 * and never their own request. */
export async function decide(tx: Db, t: Tenant, userId: string, id: string,
  to: "approved" | "rejected", d: { at: string; note: string | null }) {
  const r = await loadRequest(tx, t.companyId, id, true);
  // Lock the employee row: a pay run being created or approved holds
  // it shared, so a leave decision cannot slip past its snapshot.
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [t.companyId, r.employee_id]);
  const ref = await employeeRef(tx, t.companyId, r.employee_id);
  if (t.role === "manager") {
    if (r.employee_id === t.employeeId) throw new ApiError("SOD_VIOLATION");
    if (t.employeeId === null || ref.managerId !== t.employeeId) {
      throw new ApiError("NOT_FOUND");
    }
  }
  if (r.status !== "pending") throw new ApiError("LEAVE_NOT_PENDING");
  await tx.query(
    `UPDATE leave_requests SET status = $3, decided_by = $4,
       decided_at = $5, decision_note = $6 WHERE company_id = $1 AND id = $2`,
    [t.companyId, id, to, userId, d.at, d.note]);
  return loadRequest(tx, t.companyId, id);
}

/** Own pending request, or (owner/hr) any request not yet cancelled. */
export async function cancel(tx: Db, t: Tenant, id: string) {
  const r = await loadRequest(tx, t.companyId, id, true);
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [t.companyId, r.employee_id]);
  const own = r.employee_id === t.employeeId;
  const payroll = t.role === "owner" || t.role === "hr";
  if (!own && !payroll) {
    const ref = await employeeRef(tx, t.companyId, r.employee_id);
    throw new ApiError(inScope(viewerScope(t), ref) ? "FORBIDDEN"
      : "NOT_FOUND");
  }
  const ok = payroll ? r.status !== "cancelled" : r.status === "pending";
  if (!ok) throw new ApiError("LEAVE_NOT_CANCELLABLE");
  await tx.query("UPDATE leave_requests SET status = 'cancelled' " +
    "WHERE company_id = $1 AND id = $2", [t.companyId, id]);
  return loadRequest(tx, t.companyId, id);
}
