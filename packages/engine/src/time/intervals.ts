import { EngineError } from "../errors";

/**
 * Minutes from 00:00 Dubai of the sheet's date; `end > start`. Values
 * run from -1440 to 2880, so a shift that crosses midnight keeps its
 * own date.
 */
export interface Interval {
  start: number;
  end: number;
}

const byStart = (a: Interval, b: Interval) =>
  a.start - b.start || a.end - b.end;

/** Sorted, with overlapping and touching intervals joined. */
export function mergeIntervals(xs: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of [...xs].sort(byStart)) {
    const last = out[out.length - 1];
    if (last !== undefined && x.start <= last.end) {
      last.end = Math.max(last.end, x.end);
    } else {
      out.push({ start: x.start, end: x.end });
    }
  }
  return out;
}

export function totalMinutes(xs: readonly Interval[]): number {
  return xs.reduce((sum, x) => sum + (x.end - x.start), 0);
}

function clip(x: Interval, w: Interval): number {
  return Math.max(0, Math.min(x.end, w.end) - Math.max(x.start, w.start));
}

/** Minutes covered by both timelines (each merged first). */
export function overlapMinutes(
  a: readonly Interval[],
  b: readonly Interval[],
): number {
  const mb = mergeIntervals(b);
  return mergeIntervals(a).reduce((sum, x) =>
    sum + mb.reduce((s, w) => s + clip(x, w), 0), 0);
}

/** The parts of the merged timeline that lie outside the window. */
export function outside(xs: readonly Interval[], window: Interval):
  Interval[] {
  return mergeIntervals(xs).flatMap((x) => {
    const parts: Interval[] = [];
    if (x.start < window.start) {
      parts.push({ start: x.start, end: Math.min(x.end, window.start) });
    }
    if (x.end > window.end) {
      parts.push({ start: Math.max(x.start, window.end), end: x.end });
    }
    return parts;
  });
}

/** The last `minutes` of the merged timeline. */
export function tail(xs: readonly Interval[], minutes: number):
  Interval[] {
  let left = Math.max(0, minutes);
  const out: Interval[] = [];
  for (const x of mergeIntervals(xs).reverse()) {
    if (left <= 0) break;
    const take = Math.min(left, x.end - x.start);
    out.unshift({ start: x.end - take, end: x.end });
    left -= take;
  }
  return out;
}

/**
 * The night window on the day before, the day and the day after, so
 * work from -1440 to 2880 is covered. Not range-checked: the last
 * window ends after 2880.
 */
export function nightWindows(w: { start: number; end: number }):
  Interval[] {
  const span = w.end > w.start ? w.end - w.start : 1440 - w.start + w.end;
  return [-1, 0, 1].map((k) => ({
    start: k * 1440 + w.start,
    end: k * 1440 + w.start + span,
  }));
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" from 00:00 to 23:59 as minutes from midnight. */
export function parseHhmm(text: string): number {
  const m = HHMM.exec(text);
  if (m === null) {
    throw new EngineError("INVALID_TIME",
      "time must be HH:MM from 00:00 to 23:59", { value: text });
  }
  return Number(m[1]) * 60 + Number(m[2]);
}
