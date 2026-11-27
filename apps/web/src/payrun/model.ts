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

/**
 * How long after the preparation the visit opens, on the demo's clock:
 * the checker comes to the run a few minutes after HR finished it, so
 * a sign-off made at once never reads the same minute as "Prepared".
 */
export const DEMO_CLOCK_LEAD_MS = 12 * 60_000;

/**
 * A moment of this visit on the demo's own clock: the demo's day
 * reaches the run DEMO_CLOCK_LEAD_MS after it was prepared (09:30 on
 * 27 October, Dubai, so 09:42), and time runs on from the page
 * opening. A stamp therefore always reads later than the preparation
 * it follows, on the same day.
 */
export function demoClockIso(atMs: number, preparedOn: string,
  preparedAt: string, origin = performance.timeOrigin): string {
  const start = Date.parse(`${preparedOn}T${preparedAt}:00+04:00`);
  return new Date(start + DEMO_CLOCK_LEAD_MS +
    Math.max(0, atMs - origin)).toISOString();
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
