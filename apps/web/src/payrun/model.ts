import type { RunApproval } from "../demo/actions";
import type { MessageKey } from "../i18n/t";

export type StepId = "review" | "fix" | "approve" | "pay";
export const STEPS: readonly StepId[] = ["review", "fix", "approve", "pay"];

export const STEP_LABEL: Record<StepId, MessageKey> = {
  review: "payrun.review", fix: "payrun.fix", approve: "payrun.approve",
  pay: "payrun.pay",
};

export function stepOf(rest: string[]): StepId {
  return STEPS.find((x) => x === rest[0]) ?? "review";
}

export type StepState = "done" | "now" | "next" | "tofix" | "waiting";

/**
 * Each step's state from the shared approval, the same whichever step
 * is open (the open step is marked by the ring and aria-current): one
 * step is current. Review is done (its items never hold the run back);
 * Fix is current while bank details hold the file; then Approve; then
 * Pay. Every step can still be opened at any time.
 */
export function stepStates(_at: StepId, a: RunApproval)
  : Record<StepId, StepState> {
  const fixed = a.blockedBy.length === 0;
  const approved = a.phase === "file";
  return {
    review: "done",
    fix: fixed ? "done" : "tofix",
    approve: approved ? "done" : fixed ? "now" : "waiting",
    pay: approved ? "now" : "next",
  };
}

/** When each decision was recorded in this visit (ms since epoch). */
const decidedAt = new Map<string, number>();

/** Wall-clock ms from the page's own timer (the clock stays in main). */
export function nowMs(): number {
  return performance.timeOrigin + performance.now();
}

export function recordDecision(id: string): void {
  decidedAt.set(id, nowMs());
}

export function decisionTime(id: string): number | null {
  return decidedAt.get(id) ?? null;
}

export function forgetDecision(id: string): void {
  decidedAt.delete(id);
}
