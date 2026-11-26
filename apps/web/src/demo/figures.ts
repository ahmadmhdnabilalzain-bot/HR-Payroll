import { fils, type Fils } from "@payroll/engine";
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

/** A final settlement's total as the state has it: the engine's
 * gratuity and leave pay plus any other dues HR added by hand. */
export function settlementTotal(base: Fils, s: Pick<DemoState,
  "otherDues">, employeeId: string | null): Fils {
  const dues = employeeId === null ? undefined : s.otherDues[employeeId];
  return dues === undefined ? base : fils(base + dues.amount);
}

/** The words for a settlement's total: the engine's figure is gratuity
 * and leave pay only, so it never reads as the final amount until HR
 * has added notice pay and other dues. */
export const SETTLEMENT_SO_FAR = "Gratuity and leave pay so far";
export const SETTLEMENT_WITH_DUES = "Gratuity, leave pay and other dues";
export const SETTLEMENT_NOTE =
  "Notice pay and other dues are added by HR.";

export function settlementLabel(s: Pick<DemoState, "otherDues">,
  employeeId: string | null): string {
  return employeeId !== null && s.otherDues[employeeId] !== undefined
    ? SETTLEMENT_WITH_DUES : SETTLEMENT_SO_FAR;
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
