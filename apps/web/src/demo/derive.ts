import type {
  Approval,
  DemoData,
  Issue,
  Severity,
  SifCheck,
} from "./data/types";
import type { DemoState, Role } from "./state";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2,
  "needs-confirmation": 3 };

/** Setup items wait on someone outside the system; not problems. */
export const actionable = (i: Issue): boolean =>
  i.severity !== "needs-confirmation";

const checks = new WeakMap<object, SifCheck>();

/** The salary file check for the IBANs entered so far (memoised). */
export function sifCheck(d: DemoData, s: DemoState): SifCheck {
  const hit = checks.get(s.ibans);
  if (hit !== undefined) return hit;
  const c = d.sifCheck(s.ibans);
  checks.set(s.ibans, c);
  return c;
}

/** Bank issues settle only when the re-run file check says so. */
export function isOpen(d: DemoData, s: DemoState, i: Issue): boolean {
  if (!actionable(i)) return false;
  const id = i.employeeId ?? "";
  if (i.code === "SIF_HELD_NO_IBAN") {
    return sifCheck(d, s).heldIds.includes(id);
  }
  if (i.code === "IBAN_CHECKSUM") {
    return sifCheck(d, s).badAccountIds.includes(id);
  }
  return s.resolved[i.id] === undefined;
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

export function confirmations(d: DemoData): Issue[] {
  return d.issues().filter((i) => !actionable(i));
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
 * Who still holds the run back: the real API refuses a whole run while
 * any payslip has no bank account, so the demo never implies a partial
 * run. Approve stays disabled, with this reason, until it is empty.
 */
export function approvalBlockedBy(d: DemoData, s: DemoState): string[] {
  return sifCheck(d, s).heldIds;
}

export type RunPhase = "bank-details" | "approve" | "file";

export function runPhase(d: DemoData, s: DemoState): RunPhase {
  const run = runApprovalId(d);
  if (run !== null && s.decided[run] === "approve") return "file";
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
    : phase === "approve" ? "approve" : "bank";
  const order: [StepId, string][] = [["inputs", c.cutOff],
    ["bank", c.asOf], ["approve", c.approveBy], ["sif", c.sifDue],
    ["pay", c.payday]];
  const at = order.findIndex(([id]) => id === now);
  return order.map(([id, date], i) => ({ id, date,
    state: i < at ? "done" : i === at ? "now" : "next" }));
}
