import { daysBetween } from "@payroll/engine";
import type {
  AttendanceQuery,
  LeaveBalance,
  LeaveDecision,
  LeaveRequest,
  LeaveRequestCreate,
} from "../contract";
import { param, signedIn, type Ctx, type Handler } from "./context";
import { MockFail, notFound } from "./fail";
import { visibleEmployees } from "./handlers-people";
import { newId, record, replace } from "./state";

/** Visible people, plus the signed-in person's own record. */
function reachable(c: Ctx): Set<string> {
  const ids = new Set(visibleEmployees(c).map((e) => e.id));
  const own = signedIn(c).employeeId;
  if (own !== null) ids.add(own);
  return ids;
}

export function balances(c: Ctx, employeeId: string, year: number) {
  const mine = c.s.leave.filter((l) => l.employeeId === employeeId &&
    l.startDate.startsWith(`${year}-`));
  const sum = (typeId: string, status: LeaveRequest["status"]) => mine
    .filter((l) => l.leaveTypeId === typeId && l.status === status)
    .reduce((t, l) => t + l.days, 0);
  return c.s.leaveTypes.filter((t) => t.annualDays !== null)
    .map((t): LeaveBalance => {
      const taken = sum(t.id, "approved");
      const pending = sum(t.id, "pending");
      const entitled = t.annualDays ?? 0;
      return { leaveTypeId: t.id, year, entitledDays: entitled,
        adjustmentDays: 0, takenDays: taken, pendingDays: pending,
        remainingDays: entitled - taken - pending,
        dayCountRule: "calendar-days-inclusive" };
    });
}

function checkDates(c: Ctx, b: LeaveRequestCreate, employeeId: string) {
  if (b.endDate < b.startDate) {
    throw new MockFail("VALIDATION_FAILED", "end date is before start",
      { field: "endDate" });
  }
  if (b.startDate.slice(0, 4) !== b.endDate.slice(0, 4)) {
    throw new MockFail("LEAVE_CROSSES_YEAR", "split the request",
      { field: "endDate" });
  }
  const overlap = c.s.leave.some((l) => l.employeeId === employeeId &&
    (l.status === "pending" || l.status === "approved") &&
    l.startDate <= b.endDate && l.endDate >= b.startDate);
  if (overlap) {
    throw new MockFail("LEAVE_OVERLAP", "dates overlap another request",
      { field: "startDate" });
  }
}

function checkBalance(c: Ctx, b: LeaveRequestCreate, id: string, n: number) {
  const year = Number(b.startDate.slice(0, 4));
  const bal = balances(c, id, year).find((x) =>
    x.leaveTypeId === b.leaveTypeId);
  if (bal !== undefined && n > bal.remainingDays) {
    throw new MockFail("INSUFFICIENT_BALANCE", "not enough balance",
      { field: "endDate", remaining: String(bal.remainingDays) });
  }
}

function create(c: Ctx, b: LeaveRequestCreate): LeaveRequest {
  const employeeId = b.employeeId ?? signedIn(c).employeeId;
  if (employeeId === null) {
    throw new MockFail("NO_EMPLOYEE_LINK", "no linked employee");
  }
  if (!reachable(c).has(employeeId)) throw notFound("employee");
  if (!c.s.leaveTypes.some((t) => t.id === b.leaveTypeId)) {
    throw notFound("leave type");
  }
  checkDates(c, b, employeeId);
  const days = daysBetween(b.startDate, b.endDate) + 1;
  checkBalance(c, b, employeeId, days);
  const req: LeaveRequest = { id: newId(c.s, "leave"), employeeId,
    leaveTypeId: b.leaveTypeId, startDate: b.startDate,
    endDate: b.endDate, days, status: "pending", reason: b.reason ?? null,
    decidedBy: null, decidedAt: null };
  c.s.leave = [...c.s.leave, req];
  audit(c, "leave.requested", req);
  return req;
}

function audit(c: Ctx, action: string, l: LeaveRequest, note?: string) {
  record(c.s, signedIn(c), { at: c.now, action,
    entityType: "leave-request", entityId: l.id,
    data: note === undefined ? {} : { note } });
}

function findRequest(c: Ctx, id: string): LeaveRequest {
  const l = c.s.leave.find((x) => x.id === id);
  if (l === undefined || !reachable(c).has(l.employeeId)) {
    throw notFound("leave request");
  }
  return l;
}

function decide(c: Ctx, id: string, d: LeaveDecision, approve: boolean) {
  const l = findRequest(c, id);
  const u = signedIn(c);
  if (l.employeeId === u.employeeId) {
    throw new MockFail("SOD_VIOLATION", "cannot decide own request");
  }
  if (l.status !== "pending") {
    throw new MockFail("LEAVE_NOT_PENDING", "already decided");
  }
  const next: LeaveRequest = { ...l, decidedBy: u.id, decidedAt: c.now,
    status: approve ? "approved" : "rejected" };
  c.s.leave = replace(c.s.leave, next);
  audit(c, `leave.${next.status}`, next, d.note);
  return next;
}

function cancel(c: Ctx, id: string) {
  const l = findRequest(c, id);
  if (l.status !== "pending") {
    throw new MockFail("LEAVE_NOT_CANCELLABLE", "only pending requests");
  }
  const next: LeaveRequest = { ...l, status: "cancelled" };
  c.s.leave = replace(c.s.leave, next);
  audit(c, "leave.cancelled", next);
  return next;
}

function listRequests(c: Ctx, q: Record<string, unknown>) {
  const ids = reachable(c);
  const items = c.s.leave.filter((l) => ids.has(l.employeeId) &&
    (q["employeeId"] === undefined || l.employeeId === q["employeeId"]) &&
    (q["status"] === undefined || l.status === q["status"]));
  return { items: [...items].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)) };
}

function listAttendance(c: Ctx, q: AttendanceQuery) {
  const ids = reachable(c);
  return { items: c.s.attendance.filter((a) => ids.has(a.employeeId) &&
    (q.employeeId === undefined || a.employeeId === q.employeeId) &&
    a.date >= q.from && a.date <= q.to) };
}

export const LEAVE_HANDLERS = {
  listLeaveTypes: (c) => ({ items: c.s.leaveTypes }),
  listLeaveRequests: (c, r) => listRequests(c, r.query ?? {}),
  createLeaveRequest: (c, r) => create(c, r.body as LeaveRequestCreate),
  approveLeave: (c, r) => decide(c, param(r), r.body as LeaveDecision, true),
  rejectLeave: (c, r) => decide(c, param(r), r.body as LeaveDecision, false),
  cancelLeave: (c, r) => cancel(c, param(r)),
  listLeaveBalances: (c, r) => {
    const id = param(r);
    if (!reachable(c).has(id)) throw notFound("employee");
    const year = Number(r.query?.["year"] ?? c.today.slice(0, 4));
    return { items: balances(c, id, year) };
  },
  listAttendance: (c, r) =>
    listAttendance(c, r.query as unknown as AttendanceQuery),
} satisfies Record<string, Handler>;
