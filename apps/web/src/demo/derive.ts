import type { Approval, DemoData, Issue, Severity } from "./data/types";
import type { DemoState, Role } from "./state";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2,
  "needs-confirmation": 3 };

/** Issues a person can act on now; confirmations wait on others. */
export const actionable = (i: Issue): boolean =>
  i.severity !== "needs-confirmation";

/** Open first (most serious first), then resolved, in a stable order. */
export function openThenResolved(d: DemoData, s: DemoState): Issue[] {
  const group = (i: Issue): number => s.resolved[i.id] !== undefined
    ? 1 : 0;
  return d.issues().filter(actionable).map((i, n) => ({ i, n }))
    .sort((a, b) => group(a.i) - group(b.i) ||
      RANK[a.i.severity] - RANK[b.i.severity] || a.n - b.n)
    .map(({ i }) => i);
}

export function confirmations(d: DemoData): Issue[] {
  return d.issues().filter((i) => !actionable(i));
}

export function openIssueCount(d: DemoData, s: DemoState): number {
  return d.issues().filter((i) =>
    actionable(i) && s.resolved[i.id] === undefined).length;
}

/** The person behind a role: HR prepared the run, the GM checks it. */
export function personOf(d: DemoData, role: Role): string {
  const p = d.runPeople();
  return role === "hr" ? p.makerId : p.checkerId;
}

/** What waits for the current role's decision. */
export function waitingApprovals(d: DemoData, s: DemoState): Approval[] {
  const me = personOf(d, s.role);
  return d.approvalsInbox().filter((a) =>
    a.checkerId === me && s.decided[a.id] === undefined);
}

/** Everything still undecided, the current role's own first. */
export function pendingApprovals(d: DemoData, s: DemoState): Approval[] {
  const me = personOf(d, s.role);
  const open = d.approvalsInbox().filter((a) =>
    s.decided[a.id] === undefined);
  return [...open.filter((a) => a.checkerId === me),
    ...open.filter((a) => a.checkerId !== me)];
}

export function runApprovalId(d: DemoData): string | null {
  return d.approvalsInbox().find((a) => a.kind === "pay-run")?.id ?? null;
}

export type StepId = "inputs" | "review" | "approve" | "sif" | "pay";
/** "open": passed in time but issues are still open (never hidden). */
export type StepState = "done" | "now" | "next" | "open";

export interface Step {
  id: StepId;
  date: string;
  state: StepState;
}

/**
 * The pay run's progress. Inputs closed on the cut-off; review is
 * current while actionable issues are open, then approval is; once
 * the checker records a decision, the salary file is. Progress only:
 * nothing here stops a person acting.
 */
export function steps(d: DemoData, s: DemoState): Step[] {
  const c = d.payCalendar();
  const run = runApprovalId(d);
  const now: StepId = run !== null && s.decided[run] === "approve"
    ? "sif"
    : openIssueCount(d, s) === 0 ? "approve" : "review";
  const order: [StepId, string][] = [["inputs", c.cutOff],
    ["review", c.asOf], ["approve", c.approveBy], ["sif", c.sifDue],
    ["pay", c.payday]];
  const at = order.findIndex(([id]) => id === now);
  const open = openIssueCount(d, s) > 0;
  return order.map(([id, date], i) => ({ id, date,
    state: i === at ? "now" : i > at ? "next"
      : id === "review" && open ? "open" : "done" }));
}
