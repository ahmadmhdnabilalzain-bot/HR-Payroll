import type {
  LeaveRequest,
  LeaveRequestCreate,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { Tenant } from "../auth/guard";
import { ApiError } from "../http/errors";
import type { Sealer } from "../people/employees";
import { inScope, viewerScope } from "../people/redact";
import { balanceFor, loadLeaveType } from "./balances";
import { planRequest, type RequestPlan } from "./preview";

export interface RequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  half_units: number;
  start_part: "full" | "am" | "pm";
  end_part: "full" | "am" | "pm";
  status: LeaveRequest["status"];
  reason_enc: string | null;
  decided_by: string | null;
  created_by: string;
  decided_at: string | null;
}

/**
 * The reason is sealed with the company key (it can be health data)
 * and shown only to callers who may see the request: the person,
 * their manager (the approver) and owner or hr. Days are half-day
 * steps (Plan 9).
 */
export function toLeaveRequest(r: RequestRow, s: Sealer): LeaveRequest {
  let reason: string | null = null;
  try {
    reason = s.open("reason_enc", r.id, r.reason_enc);
  } catch {
    reason = null;
  }
  return { id: r.id, employeeId: r.employee_id,
    leaveTypeId: r.leave_type_id, startDate: r.start_date,
    endDate: r.end_date, days: r.half_units / 2, status: r.status, reason,
    decidedBy: r.decided_by, decidedAt: r.decided_at,
    startPart: r.start_part, endPart: r.end_part };
}

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

function checkDates(b: LeaveRequestCreate): void {
  if (b.endDate < b.startDate) {
    throw new ApiError("VALIDATION_FAILED", "endDate is before startDate",
      { fields: ["body.endDate"] });
  }
  if (b.startDate.slice(0, 4) !== b.endDate.slice(0, 4)) {
    throw new ApiError("LEAVE_CROSSES_YEAR");
  }
}

/** Plans a request for its subject (dates, policy, warnings). */
export async function planFor(tx: Db, t: Tenant, b: LeaveRequestCreate,
  today: string) {
  const employeeId = await subject(tx, t, b);
  checkDates(b);
  // Lock the employee row: parallel requests for one person queue.
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [t.companyId, employeeId]);
  return { employeeId, plan: await planRequest(tx, t, employeeId, b,
    today) };
}

async function insertRequest(tx: Db, t: Tenant, userId: string,
  ids: { id: string; at: string }, emp: string, b: LeaveRequestCreate,
  plan: RequestPlan, s: Sealer) {
  await tx.query(
    `INSERT INTO leave_requests (id, company_id, employee_id, leave_type_id,
       start_date, end_date, half_units, start_part, end_part, status,
       reason_enc, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12)`,
    [ids.id, t.companyId, emp, b.leaveTypeId, b.startDate, b.endDate,
      plan.count.halves, b.startPart ?? "full", b.endPart ?? "full",
      s.seal("reason_enc", ids.id, b.reason ?? null), userId, ids.at]);
  for (const d of plan.count.dates) {
    await tx.query(
      `INSERT INTO leave_request_dates (company_id, request_id, date,
         halves, part) VALUES ($1, $2, $3, $4, $5)`,
      [t.companyId, ids.id, d.date, d.halves, d.part]);
  }
}

/** Creates the request; the plan's first blocking problem is thrown. */
export async function createRequest(tx: Db, t: Tenant, userId: string,
  ids: { id: string; at: string; today: string }, b: LeaveRequestCreate,
  s: Sealer) {
  const { employeeId, plan } = await planFor(tx, t, b, ids.today);
  if (plan.blocked !== null) {
    throw new ApiError(plan.blocked.code, undefined,
      plan.blocked.dates.length > 0 ? { dates: plan.blocked.dates }
        : undefined);
  }
  await insertRequest(tx, t, userId, ids, employeeId, b, plan, s);
  return { row: await loadRequest(tx, t.companyId, ids.id), plan };
}

/**
 * Approve or reject: pending only; a manager only for direct reports;
 * nobody decides their own request or one they filed. Approval
 * rechecks the balance (never below zero).
 */
export async function decide(tx: Db, t: Tenant, userId: string, id: string,
  to: "approved" | "rejected", d: { at: string; note: string | null },
  s: Sealer) {
  const r = await loadRequest(tx, t.companyId, id, true);
  // Lock the employee row: a pay run being created or approved holds
  // it shared, so a leave decision cannot slip past its snapshot.
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [t.companyId, r.employee_id]);
  const ref = await employeeRef(tx, t.companyId, r.employee_id);
  if (t.role === "manager" &&
    r.employee_id !== t.employeeId && ref.managerId !== t.employeeId) {
    throw new ApiError("NOT_FOUND");
  }
  if (r.employee_id === t.employeeId || r.created_by === userId) {
    throw new ApiError("SOD_VIOLATION");
  }
  if (r.status !== "pending") throw new ApiError("LEAVE_NOT_PENDING");
  if (to === "approved") await recheckBalance(tx, t.companyId, r);
  await tx.query(
    `UPDATE leave_requests SET status = $3, decided_by = $4,
       decided_at = $5, decision_note_enc = $6
     WHERE company_id = $1 AND id = $2`,
    [t.companyId, id, to, userId, d.at,
      s.seal("decision_note_enc", id, d.note)]);
  return loadRequest(tx, t.companyId, id);
}

/** Own pending request, or (owner/hr) any request not yet cancelled. */
/** The balance after approval may not go below zero. */
async function recheckBalance(tx: Db, companyId: string, r: RequestRow) {
  const type = await loadLeaveType(tx, companyId, r.leave_type_id);
  if (type.annual_days === null) return;
  const bal = await balanceFor(tx, companyId, r.employee_id, type.id,
    Number(r.start_date.slice(0, 4)));
  if (bal.remainingDays < 0) throw new ApiError("INSUFFICIENT_BALANCE");
}

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
