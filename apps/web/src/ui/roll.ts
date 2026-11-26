/**
 * The digit roll behind <Money/> and <Count/>, as pure functions so
 * the "never a wrong amount" rule can be checked frame by frame in a
 * unit test (tests/unit/roll.test.ts) without a browser.
 *
 * A changed figure is diffed right-aligned against the old one. When
 * both have the same characters in the same places except some digits
 * (the usual case: 1,234.50 to 1,284.50), only those digits roll; the
 * rest stay still. Anything else (a sign flips, the figure gains or
 * loses a digit or a separator) crossfades the whole figure instead,
 * old fully out before new comes in.
 *
 * Each rolling digit is a two-glyph column (old and new) slid one
 * digit's height inside a clip. The timeline has three phases:
 *
 *   0 .. A      every column moves together to SPLIT_IN of the way,
 *               while the changed digits dim to DIM and blur by
 *               BLUR (the "in transit" look);
 *   A .. B+s    the middle of the slide, staggered right to left,
 *               STAGGER_MS per changed digit (capped at MAX_RANK);
 *   B+s .. END  every column is at SPLIT_OUT and finishes together,
 *               brightening back to full.
 *
 * Outside the middle phase all changed digits are at the same point
 * of their slide, so the figure reads as the old amount or the new
 * one, never a mix. Inside it every changed digit is dimmed and no
 * more than SPLIT_OUT of either glyph shows, so none is legible
 * (opacity x visible share stays under LEGIBLE). The stagger lives
 * only where nothing can be read.
 */

/** Total length of a roll, ms (the slow token). */
export const ROLL_MS = 320;
/** End of the shared opening phase, ms. */
export const PHASE_A = 90;
/** End of the middle phase for the rightmost changed digit, ms. */
export const PHASE_B = 170;
/** Right-to-left delay per changed digit, ms. */
export const STAGGER_MS = 20;
/** Ranks beyond this share the last delay (spread <= 60 ms). */
export const MAX_RANK = 3;
/** Slide progress at the end of the opening phase. */
export const SPLIT_IN = 0.3;
/** Slide progress at the start of the closing phase. */
export const SPLIT_OUT = 0.7;
/** Opacity of the changed digits through the middle phase. */
export const DIM = 0.25;
/** Blur of the changed digits through the middle phase. */
export const BLUR = "0.14em";
/** A glyph at or above this (opacity x share in the clip) is read. */
export const LEGIBLE = 0.5;
/** Whole-figure crossfade: old out over this, then new in over it. */
export const SWAP_MS = 120;

export type Plan =
  | { kind: "same" }
  | { kind: "swap" }
  | { kind: "roll"; slots: Slot[] };

export interface Slot {
  /** The character now (what stays in the DOM once settled). */
  to: string;
  /** The character before, when this digit rolls. */
  from?: string;
  /** 0 for the rightmost changed digit, counting leftwards. */
  rank?: number;
}

const DIGIT = /[0-9]/;

/** Which digits roll, or "swap" when the shape of the figure changed. */
export function planRoll(from: string, to: string): Plan {
  if (from === to) return { kind: "same" };
  if (from.length !== to.length) return { kind: "swap" };
  let rank = 0;
  const slots: Slot[] = [];
  for (let i = to.length - 1; i >= 0; i--) {
    const a = from[i]!;
    const b = to[i]!;
    if (a === b) {
      slots.unshift({ to: b });
      continue;
    }
    if (!DIGIT.test(a) || !DIGIT.test(b)) return { kind: "swap" };
    slots.unshift({ to: b, from: a, rank: Math.min(rank, MAX_RANK) });
    rank += 1;
  }
  return { kind: "roll", slots };
}

/** When a digit of this rank leaves the middle phase, ms. */
export const middleEnd = (rank: number): number =>
  PHASE_B + Math.min(rank, MAX_RANK) * STAGGER_MS;

/** Slide progress (0 old in view .. 1 new in view) at time t. */
export function slideAt(rank: number, t: number): number {
  const b = middleEnd(rank);
  if (t <= 0) return 0;
  if (t >= ROLL_MS) return 1;
  if (t <= PHASE_A) return SPLIT_IN * easeIn(t / PHASE_A);
  if (t <= b) {
    return SPLIT_IN + (SPLIT_OUT - SPLIT_IN) * (t - PHASE_A) / (b - PHASE_A);
  }
  const shared = middleEnd(MAX_RANK);
  if (t <= shared) return SPLIT_OUT;
  return SPLIT_OUT + (1 - SPLIT_OUT) *
    easeOut((t - shared) / (ROLL_MS - shared));
}

/** Opacity of every changed digit at time t. */
export function dimAt(t: number): number {
  const shared = middleEnd(MAX_RANK);
  if (t <= 0 || t >= ROLL_MS) return 1;
  if (t <= PHASE_A) return 1 - (1 - DIM) * (t / PHASE_A);
  if (t <= shared) return DIM;
  return DIM + (1 - DIM) * ((t - shared) / (ROLL_MS - shared));
}

// The keyframe easings, as plain functions for the model. The browser
// gets the same curves as keyframe offsets (see slideKeyframes).
const easeIn = (x: number): number => x * x;
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);

/**
 * The column's transform keyframes for a digit of this rank. The
 * column is [old, new] for a rise (it slides up) and [new, old] for a
 * fall (it slides down), each glyph one line tall.
 */
export function slideKeyframes(rank: number, up: boolean): Keyframe[] {
  const y = (p: number): string =>
    `translateY(${((up ? -p : p - 1) * 50).toFixed(3)}%)`;
  const shared = middleEnd(MAX_RANK);
  const b = middleEnd(rank);
  return [
    { offset: 0, transform: y(0), easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
    { offset: PHASE_A / ROLL_MS, transform: y(SPLIT_IN), easing: "linear" },
    { offset: b / ROLL_MS, transform: y(SPLIT_OUT), easing: "linear" },
    { offset: shared / ROLL_MS, transform: y(SPLIT_OUT),
      easing: "cubic-bezier(0, 0.55, 0.45, 1)" },
    { offset: 1, transform: y(1) },
  ];
}

/** The changed digits' opacity keyframes (the same for every rank). */
export function dimKeyframes(): Keyframe[] {
  const shared = middleEnd(MAX_RANK);
  return [
    { offset: 0, opacity: 1, filter: "blur(0)" },
    { offset: PHASE_A / ROLL_MS, opacity: DIM, filter: `blur(${BLUR})` },
    { offset: shared / ROLL_MS, opacity: DIM, filter: `blur(${BLUR})` },
    { offset: 1, opacity: 1, filter: "blur(0)" },
  ];
}

/** Opacity of the old and the new face in a whole-figure swap. */
export function swapAt(t: number): { old: number; new: number } {
  if (t <= 0) return { old: 1, new: 0 };
  if (t < SWAP_MS) return { old: 1 - t / SWAP_MS, new: 0 };
  if (t < SWAP_MS * 2) return { old: 0, new: (t - SWAP_MS) / SWAP_MS };
  return { old: 0, new: 1 };
}

/**
 * What a reader could take from the figure at time t: for each
 * changed digit, "old", "new" or null (not legible). Used by the unit
 * test and by the browser frame check.
 */
export function legibleAt(slots: Slot[], t: number): ("old" | "new" |
  null)[] {
  const op = dimAt(t);
  return slots.filter((x) => x.from !== undefined).map((x) => {
    const p = slideAt(x.rank ?? 0, t);
    if (op * (1 - p) >= LEGIBLE) return "old";
    if (op * p >= LEGIBLE) return "new";
    return null;
  });
}
