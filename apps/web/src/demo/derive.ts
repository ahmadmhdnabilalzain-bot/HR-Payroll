import type { Approval, DemoData, Issue, Severity } from "./data/types";
import type { DemoState } from "./state";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Issues a person can act on (notes are shown but never "open"). */
export const actionable = (i: Issue): boolean => i.severity !== "info";

/** Open first (most serious first), then notes, then resolved. */
export function orderedIssues(d: DemoData, s: DemoState): Issue[] {
  const group = (i: Issue): number => s.resolved[i.id] !== undefined ? 2
    : actionable(i) ? 0 : 1;
  return d.issues().map((i, n) => ({ i, n })).sort((a, b) =>
    group(a.i) - group(b.i) || RANK[a.i.severity] - RANK[b.i.severity] ||
    a.n - b.n).map(({ i }) => i);
}

export function openIssueCount(d: DemoData, s: DemoState): number {
  return d.issues().filter((i) =>
    actionable(i) && s.resolved[i.id] === undefined).length;
}

export function waitingApprovals(d: DemoData, s: DemoState): Approval[] {
  return d.approvalsInbox().filter((a) => !s.decided.includes(a.id));
}

export type StepId = "inputs" | "review" | "approve" | "sif" | "pay";
export type StepState = "done" | "now" | "next";

export interface Step {
  id: StepId;
  date: string;
  state: StepState;
}

/**
 * The pay run's progress. Inputs close on the cut-off; review is the
 * current step while actionable issues are open; then approval is.
 * Progress, not a gate: nothing here stops a person acting.
 */
export function steps(d: DemoData, s: DemoState): Step[] {
  const c = d.payCalendar();
  const reviewDone = openIssueCount(d, s) === 0;
  const now: StepId = reviewDone ? "approve" : "review";
  const order: [StepId, string][] = [["inputs", c.cutOff],
    ["review", c.asOf], ["approve", c.approveBy], ["sif", c.sifDue],
    ["pay", c.payday]];
  const at = order.findIndex(([id]) => id === now);
  return order.map(([id, date], i) => ({ id, date,
    state: i < at ? "done" : i === at ? "now" : "next" }));
}

/** Gross minus net: what the run deducts, from the selector totals. */
export function deductionsOf(d: DemoData): bigint {
  const h = d.headline();
  return h.grossTotalFils - h.netTotalFils;
}
