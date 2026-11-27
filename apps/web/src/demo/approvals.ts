import type { Approval, DemoData } from "./data/types";
import { approvalBlockedBy } from "./derive";
import { hrefOf } from "./route";
import type { Action, DemoState, Role, Verdict } from "./state";
import { allApprovals, personFor } from "./time-off";

/**
 * The one approvals source. Every surface that lists or counts what
 * waits for a decision (Home, the people strip, the search palette,
 * the dashboards, the owner brief, the Time and Pay pages) reads it
 * here: the package's inbox, the demo's own requests and a crew's
 * overtime. Only the checker decides, never the maker.
 */
export function approvalItems(d: DemoData, s: DemoState): Approval[] {
  return [...allApprovals(d, s), ...d.crewApprovals()];
}

/** The decision recorded for an item, from the store it lives in. */
export function verdictOf(s: DemoState, a: Approval): Verdict | undefined {
  if (a.kind === "overtime") {
    const t = s.timeDecided[a.id];
    return t === undefined ? undefined
      : t.verdict === "accept" ? "approve" : "decline";
  }
  return s.decided[a.id];
}

/** A role's decide right: it is the checker, and not the maker. */
export function mayDecide(d: DemoData, role: Role, a: Approval): boolean {
  const me = personFor(d, role);
  return a.checkerId === me && a.makerId !== me;
}

/** The store action that records a decision (and the one to undo). */
export function decideAction(d: DemoData, role: Role, a: Approval,
  verdict: Verdict): Action {
  return a.kind === "overtime" ? { type: "time-decide", id: a.id,
    verdict: verdict === "approve" ? "accept" : "decline",
    by: personFor(d, role) } : { type: "decide", id: a.id, verdict };
}

export function undoAction(a: Approval): Action {
  return a.kind === "overtime" ? { type: "time-undo", id: a.id }
    : { type: "undecide", id: a.id };
}

/** Still undecided. */
export function openApprovals(d: DemoData, s: DemoState): Approval[] {
  return approvalItems(d, s).filter((a) => verdictOf(s, a) === undefined);
}

/** The pay run reaches its checker only once nothing holds it back. */
export function isSent(d: DemoData, s: DemoState, a: Approval): boolean {
  return a.kind !== "pay-run" || approvalBlockedBy(d, s).length === 0;
}

/** What waits for this role's own decision now: the count every
 * surface shows as "waiting for your decision". */
export function decisionsFor(d: DemoData, s: DemoState): Approval[] {
  return openApprovals(d, s).filter((a) => mayDecide(d, s.role, a) &&
    isSent(d, s, a));
}

/**
 * What a role's approvals list shows: its own decisions first, then
 * what it asked for that waits for someone else. HR, who runs the
 * process, also sees everything else that waits (and for whom).
 */
export function approvalsShown(d: DemoData, s: DemoState): Approval[] {
  const me = personFor(d, s.role);
  const open = openApprovals(d, s);
  const mine = open.filter((a) => mayDecide(d, s.role, a));
  const rest = open.filter((a) => !mine.includes(a) &&
    (s.role === "hr" || a.makerId === me));
  return [...mine, ...rest];
}

/**
 * What the viewer sees waiting for a decision: the one list and the
 * one count behind every "Waiting for a decision" figure (Home, the
 * dashboards, the owner brief). A pay run still held back by open
 * problems is not counted: it has not reached its checker.
 */
export function waitingList(d: DemoData, s: DemoState): Approval[] {
  return approvalsShown(d, s).filter((a) => isSent(d, s, a));
}

export const waitingCount = (d: DemoData, s: DemoState): number =>
  waitingList(d, s).length;

/**
 * The record a decision is about: the pay run's sign-off step, the
 * leave requests (no page per request yet), the expense claim, the
 * crew booking.
 */
export function approvalHref(a: Pick<Approval, "id" | "kind" |
  "subjectId">): string {
  switch (a.kind) {
    case "pay-run": return hrefOf("pay-run", "approve");
    case "leave": return hrefOf("time-off");
    case "expense": return a.subjectId === undefined
      ? hrefOf("pay-run", "expenses")
      : hrefOf("pay-run", "expenses", a.subjectId);
    case "overtime": return hrefOf("time-off", "overtime", "crew",
      a.subjectId ?? a.id);
  }
}
