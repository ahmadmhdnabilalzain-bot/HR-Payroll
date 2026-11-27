import type { Approval, DemoData, Localized } from "./data/types";
import type {
  AnnualBalance,
  LeaveTypeId,
  LeaveUse,
} from "./data/people-types";
import type { DemoState, Role } from "./state";

/** The person each role stands for (all from the data). */
export function personFor(d: DemoData, role: Role): string {
  const p = d.people.personas();
  switch (role) {
    case "hr": return p.hrId;
    case "gm": return p.gmId;
    case "manager": return p.managerId;
    case "employee": return p.employeeId;
    case "it": return p.itId;
  }
}

/** Who a role may see in People and Time off. The IT manager sees the
 * directory (to set up access) but no one's pay (canSeePay). */
export function visibleIds(d: DemoData, s: Pick<DemoState, "role">)
  : string[] {
  const me = personFor(d, s.role);
  const all = d.people.people();
  if (s.role === "hr" || s.role === "gm" || s.role === "it") {
    return all.map((p) => p.id);
  }
  if (s.role === "employee") return [me];
  return all.filter((p) => p.id === me || p.approverId === me)
    .map((p) => p.id);
}

export function canSee(d: DemoData, s: Pick<DemoState, "role">,
  id: string): boolean {
  return visibleIds(d, s).includes(id);
}

/**
 * Whose leave a role sees in Time off: the IT manager sees the
 * directory, but only their own leave (leave reasons are HR's).
 */
export function leaveIds(d: DemoData, s: Pick<DemoState, "role">)
  : string[] {
  return s.role === "it" ? [personFor(d, s.role)] : visibleIds(d, s);
}

/** True when the role sees only their own leave. */
export const ownLeaveOnly = (s: Pick<DemoState, "role">): boolean =>
  s.role === "employee" || s.role === "it";

/** HR and the GM see everyone's pay; others only their own. */
export function canSeePay(d: DemoData, s: Pick<DemoState, "role">,
  id: string): boolean {
  if (s.role === "hr" || s.role === "gm") return true;
  return id === personFor(d, s.role);
}

/** A request's state, as the screens word it. */
export type RequestState = "waiting" | "booked" | "declined" |
  "withdrawn";

export interface RequestRow {
  id: string;
  employeeId: string;
  leaveTypeId: LeaveTypeId;
  startDate: string;
  endDate: string;
  halves: number;
  state: RequestState;
  approverId: string;
  approvalId: string | null;
  reason: Localized;
  note: string;
  /** Made during this demo (can be withdrawn while waiting). */
  isNew: boolean;
  /** Decided during this demo: the date is the demo's today. */
  decidedOn: string | null;
}

function fromDecision(s: DemoState, approvalId: string | null,
  fallback: RequestState): RequestState {
  if (approvalId === null) return fallback;
  const v = s.decided[approvalId];
  if (v === undefined) return fallback;
  return v === "approve" ? "booked" : "declined";
}

/** Every leave request: the package's and the demo's, newest first. */
export function requestRows(d: DemoData, s: DemoState): RequestRow[] {
  const asOf = d.people.asOf;
  const reasons = d.people.reasons();
  const made = s.requests.map((r): RequestRow => ({ id: r.id,
    employeeId: r.employeeId, leaveTypeId: r.leaveTypeId,
    startDate: r.startDate, endDate: r.endDate, halves: r.halves,
    state: r.withdrawn ? "withdrawn"
      : fromDecision(s, r.approvalId, "waiting"),
    approverId: r.checkerId, approvalId: r.approvalId,
    reason: reasons.find((x) => x.key === r.reasonKey)?.text
      ?? { en: "", ar: "" }, note: r.note, isNew: true,
    decidedOn: s.decided[r.approvalId] === undefined ? null : asOf }));
  const base = d.people.leaveRequests().map((r): RequestRow => {
    const fallback: RequestState = r.status === "approved" ? "booked"
      : r.status === "rejected" ? "declined" : "waiting";
    const decided = r.approvalId !== null &&
      s.decided[r.approvalId] !== undefined;
    return { id: r.id, employeeId: r.employeeId,
      leaveTypeId: r.leaveTypeId, startDate: r.startDate,
      endDate: r.endDate, halves: r.halves,
      state: fromDecision(s, r.approvalId, fallback),
      approverId: r.approverId, approvalId: r.approvalId,
      reason: r.reason, note: "", isNew: false,
      decidedOn: decided ? asOf : null };
  });
  return [...made, ...base.sort((a, b) =>
    b.startDate.localeCompare(a.startDate))];
}

/** Booked leave is taken, waiting leave is pending; the rest is not. */
export function usesOf(rows: RequestRow[]): LeaveUse[] {
  return rows.filter((r) => r.state === "booked" || r.state === "waiting")
    .map((r) => ({ employeeId: r.employeeId, leaveTypeId: r.leaveTypeId,
      startDate: r.startDate, halves: r.halves,
      state: r.state === "booked" ? "taken" : "pending" }));
}

/** The engine's annual balance with every decision so far. */
export function annualNow(d: DemoData, s: DemoState, id: string)
  : AnnualBalance | null {
  return d.people.annualBalance(id, usesOf(requestRows(d, s)));
}

/** Days of a type used this year (booked only), in half-days. */
export function usedHalves(rows: RequestRow[], id: string,
  type: LeaveTypeId): number {
  return rows.filter((r) => r.employeeId === id && r.leaveTypeId === type &&
    r.state === "booked" && r.startDate.startsWith("2026"))
    .reduce((n, r) => n + r.halves, 0);
}

/** The demo's new requests as approvals, for Home's inbox. */
export function sessionApprovals(d: DemoData, s: DemoState): Approval[] {
  const claims: Approval[] = s.claims.filter((c) => !c.withdrawn)
    .map((c) => ({ id: c.approvalId, kind: "expense", employeeId:
      c.employeeId, title: { en: `Expense claim: ${c.kind}`,
        ar: `Expense claim: ${c.kind}` }, requestedOn: c.requestedOn,
    amountFils: c.amount, makerId: c.employeeId,
    checkerId: c.checkerId }));
  const grants: Approval[] = s.grants.filter((g) => !g.withdrawn)
    .map((g) => ({ id: g.approvalId, kind: "leave", employeeId:
      g.employeeId, title: { en: `Leave grant: ${g.days} ` +
        `${g.days === 1 ? "day" : "days"}`, ar: `Leave grant: ${g.days} ` +
        `${g.days === 1 ? "day" : "days"}` }, requestedOn: g.requestedOn,
    amountFils: null, makerId: g.makerId, checkerId: g.checkerId }));
  return [...claims, ...grants, ...sessionLeave(d, s)];
}

function sessionLeave(d: DemoData, s: DemoState): Approval[] {
  return s.requests.filter((r) => !r.withdrawn).map((r) => ({
    id: r.approvalId, kind: "leave", employeeId: r.employeeId,
    title: d.people.leaveApprovalTitle, requestedOn: r.requestedOn,
    amountFils: null, makerId: r.employeeId, checkerId: r.checkerId }));
}

/** The package's inbox plus the demo's requests, newest first. */
export function allApprovals(d: DemoData, s: DemoState): Approval[] {
  return [...sessionApprovals(d, s), ...d.approvalsInbox()];
}

/** Other people's booked or waiting leave on any of the same days,
 * among those the viewer may see: what an approver weighs. */
export function overlapsOf(rows: RequestRow[], r: RequestRow,
  visible: ReadonlySet<string>): RequestRow[] {
  const seen = new Set<string>();
  return rows.filter((x) => x.id !== r.id &&
    x.employeeId !== r.employeeId && visible.has(x.employeeId) &&
    (x.state === "booked" || x.state === "waiting") &&
    x.startDate <= r.endDate && r.startDate <= x.endDate)
    // One mention per person and range: two requests for the same
    // days read as one clash, not "Jose Reyes and Jose Reyes".
    .filter((x) => {
      const k = `${x.employeeId}|${x.startDate}|${x.endDate}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** Who is off on a date (booked, or waiting when asked for). */
export function offOn(rows: RequestRow[], date: string): RequestRow[] {
  return rows.filter((r) => (r.state === "booked" ||
    r.state === "waiting") && r.startDate <= date && date <= r.endDate);
}
