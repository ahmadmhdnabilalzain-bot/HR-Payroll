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
 * Each step's state from the shared approval: Fix is done when nothing
 * holds the file; Approve when the decision is recorded; Pay is ready
 * once approved. Progress only: every step can be opened at any time.
 */
export function stepStates(at: StepId, a: RunApproval)
  : Record<StepId, StepState> {
  const fixed = a.blockedBy.length === 0;
  const approved = a.phase === "file";
  const cur = (id: StepId, done: boolean, fallback: StepState)
    : StepState => done ? "done" : at === id ? "now" : fallback;
  return {
    review: at === "review" ? "now" : "done",
    fix: fixed ? (at === "fix" ? "now" : "done") : "tofix",
    approve: cur("approve", approved, fixed ? "next" : "waiting"),
    // "Now" only for the step on screen: after sign-off on Approve,
    // Pay reads "Next" until it is opened.
    pay: at === "pay" ? "now" : "next",
  };
}

/** When each decision was recorded in this visit (ms since epoch). */
const decidedAt = new Map<string, number>();

export function recordDecision(id: string): void {
  decidedAt.set(id, performance.timeOrigin + performance.now());
}

export function decisionTime(id: string): number | null {
  return decidedAt.get(id) ?? null;
}

export function forgetDecision(id: string): void {
  decidedAt.delete(id);
}
