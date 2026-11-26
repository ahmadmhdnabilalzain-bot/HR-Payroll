import type { ExplainStep } from "./types";

/**
 * When each line of the working lands, in ms from the drawer opening.
 * The figure lands first; then the lines assemble one by one, each
 * amount sliding up into place whole (never counted up, so no line
 * ever shows a number it does not end on); a total starts only once
 * the line before it has fully landed, so it never arrives ahead of
 * what it adds up; the last total (the sum check) lands last; what
 * went in, the rules and the rest follow.
 */
export interface Assembly {
  /** Start of each step's entrance. */
  at: number[];
  /** Index of the sum-check line (the last total), or -1. */
  check: number;
  /** Start of the sections after the working. */
  after: number;
}

/** The first line starts as the figure settles into the header (it
 * lands at 420 ms on the shared spring, most of the way by 360). */
export const STEPS_FROM = 360;
/** Desktop stagger between lines (80 to 120 ms by design). */
export const STEP_GAP = 96;
/** Phone: lighter, a shorter stagger. */
export const STEP_GAP_PHONE = 56;
/** One line's entrance (the amount's slide and the rule drawing). */
export const STEP_MS = 280;
/** The beat between the last addend landing and its total. */
export const TOTAL_BEAT = 40;
/** However long the working, the last line starts by this. */
const SPAN = 1100;

export function assembly(steps: readonly ExplainStep[], phone = false)
  : Assembly {
  const n = steps.length;
  const base = phone ? STEP_GAP_PHONE : STEP_GAP;
  // A long working tightens its stagger so it never drags on.
  const gap = n <= 1 ? base
    : Math.max(phone ? 32 : 48, Math.min(base, Math.floor(SPAN / n)));
  const at: number[] = [];
  let check = -1;
  steps.forEach((x, i) => {
    const prev = at[i - 1];
    let t = prev === undefined ? STEPS_FROM : prev + gap;
    if (x.op === "total" && prev !== undefined) {
      t = Math.max(t, prev + STEP_MS + TOTAL_BEAT);
    }
    at.push(t);
    if (x.op === "total") check = i;
  });
  const last = at[n - 1] ?? STEPS_FROM;
  return { at, check, after: last + STEP_MS };
}
