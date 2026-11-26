import type { Fils } from "@payroll/engine";
import type { DemoData } from "./data/types";
import { isBlocking, openIssues, runPhase, type RunPhase } from "./derive";
import type { DemoState } from "./state";

/**
 * The company's live figures, worked out once from the shared state.
 * Every surface that shows one of these (Home, the pay run, the HR and
 * executive dashboards, the owner brief, the board pack) reads it from
 * here, so a figure can never be stale on one page and live on another.
 */
export interface Figures {
  /** Net pay still held out of the salary file (no valid account). */
  heldNetFils: Fils;
  /** Open problems that stop the run being approved (bank details). */
  blocking: number;
  /** Open problems to review; they never hold the run back. */
  toReview: number;
  /** All open problems: blocking plus to review. */
  open: number;
  /** People on the run month's payroll (31: the leaver's part month). */
  onPayroll: number;
  /** People employed on the demo's today (30). */
  activeToday: number;
  phase: RunPhase;
  /** True once the checker has signed the run off. */
  signedOff: boolean;
}

export function figures(d: DemoData, s: DemoState): Figures {
  const h = d.headline();
  const open = openIssues(d, s);
  const blocking = open.filter(isBlocking).length;
  const phase = runPhase(d, s);
  return { heldNetFils: h.heldNetFils, blocking,
    toReview: open.length - blocking, open: open.length,
    onPayroll: h.headcount, activeToday: h.activeToday, phase,
    signedOff: phase === "file" };
}
