import type { Approval, DemoData, Issue, Severity } from "./data/types";
import type { DemoState, Role } from "./state";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Only kind "issue" is a problem to fix before approval. */
export const actionable = (i: Issue): boolean => i.kind === "issue";

/** Open until settled; bank issues leave the data when an IBAN passes. */
export function isOpen(_d: DemoData, s: DemoState, i: Issue): boolean {
  return actionable(i) && s.resolved[i.id] === undefined;
}

/** Open first (most serious first), then settled, in a stable order. */
export function openThenSettled(d: DemoData, s: DemoState): Issue[] {
  return d.issues().filter(actionable).map((i, n) => ({ i, n,
    g: isOpen(d, s, i) ? 0 : 1 }))
    .sort((a, b) => a.g - b.g || RANK[a.i.severity] - RANK[b.i.severity] ||
      a.n - b.n).map(({ i }) => i);
}

export function openIssues(d: DemoData, s: DemoState): Issue[] {
  return openThenSettled(d, s).filter((i) => isOpen(d, s, i));
}

/** Client setup to confirm (pension fund, settlement inputs). */
export function confirmations(d: DemoData): Issue[] {
  return d.issues().filter((i) => i.kind === "needs-confirmation");
}

/** Context shown once, quietly (the invented demo bank code). */
export function notes(d: DemoData): Issue[] {
  return d.issues().filter((i) => i.kind === "note");
}

/** The person behind a role: HR prepared the run, the GM checks it. */
export function personOf(d: DemoData, role: Role): string {
  const p = d.runPeople();
  return role === "hr" ? p.makerId : p.checkerId;
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

/**
 * Who still holds the run back: a payslip with no bank account (the
 * real API refuses the whole run) or an IBAN that fails its check
 * digits (the bank would reject it). The demo never implies a partial
 * run, so Approve stays disabled, with this reason, until it is empty.
 */
export function approvalBlockedBy(d: DemoData, _s: DemoState)
  : string[] {
  return [...new Set([...d.heldIds(), ...d.badIbanIds()])];
}

/** The open issue that blocks approval for one person, if any. */
export function isBlocking(i: Issue): boolean {
  return i.code === "SIF_HELD_NO_IBAN" || i.code === "IBAN_CHECKSUM";
}

/** "declined": the GM sent the run back to HR (undo restores it). */
export type RunPhase = "bank-details" | "approve" | "file" | "declined";

export function runPhase(d: DemoData, s: DemoState): RunPhase {
  const run = runApprovalId(d);
  if (run !== null && s.decided[run] === "approve") return "file";
  if (run !== null && s.decided[run] === "decline") return "declined";
  return approvalBlockedBy(d, s).length > 0 ? "bank-details" : "approve";
}

export type StepId = "inputs" | "bank" | "approve" | "sif" | "pay";
export type StepState = "done" | "now" | "next";

export interface Step {
  id: StepId;
  date: string;
  state: StepState;
}

/**
 * The pay month as five dated steps. Inputs closed on the cut-off;
 * bank details are current while a payslip is held out; then the
 * approval; then the salary file. Review items never hold it back.
 */
export function steps(d: DemoData, s: DemoState): Step[] {
  const c = d.payCalendar();
  const phase = runPhase(d, s);
  const now: StepId = phase === "file" ? "sif"
    : phase === "approve" || phase === "declined" ? "approve" : "bank";
  const order: [StepId, string][] = [["inputs", c.cutOff],
    ["bank", c.asOf], ["approve", c.approveBy], ["sif", c.sifDue],
    ["pay", c.payday]];
  const at = order.findIndex(([id]) => id === now);
  return order.map(([id, date], i) => ({ id, date,
    state: i < at ? "done" : i === at ? "now" : "next" }));
}
