import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Interval,
  mergeIntervals,
  nightWindows,
  outside,
  overlapMinutes,
  parseHhmm,
  tail,
  totalMinutes,
} from "../src/time/intervals";

const iv = (start: number, end: number): Interval => ({ start, end });
const ivs = (xs: [number, number][]): Interval[] =>
  xs.map(([a, b]) => iv(a, b));

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

const NIGHT = nightWindows({ start: 1320, end: 240 });

const arbIntervals = fc.array(
  fc.tuple(fc.integer({ min: -1440, max: 2879 }),
    fc.integer({ min: 1, max: 600 }))
    .map(([s, len]) => iv(s, Math.min(2880, s + len))),
  { maxLength: 6 },
);

describe("time intervals", () => {
  it("merges_overlapping_and_touching", () => {
    expect(mergeIntervals(ivs([[10, 20], [20, 30], [5, 8]])))
      .toEqual(ivs([[5, 8], [10, 30]]));
  });
  it("night_windows_three_days", () => {
    expect(NIGHT).toEqual(ivs([[-120, 240], [1320, 1680], [2760, 3120]]));
  });
  it("night_window_not_crossing_midnight", () => {
    expect(nightWindows({ start: 60, end: 240 }))
      .toEqual(ivs([[-1380, -1200], [60, 240], [1500, 1680]]));
  });
  it("overlap_with_night", () => {
    expect(overlapMinutes(ivs([[1300, 1400]]), NIGHT)).toBe(80);
  });
  it("tail_takes_last_minutes", () => {
    expect(tail(ivs([[600, 700], [800, 900]]), 150))
      .toEqual(ivs([[650, 700], [800, 900]]));
    expect(tail(ivs([[600, 700]]), 0)).toEqual([]);
  });
  it("outside_window", () => {
    expect(outside(ivs([[180, 840]]), iv(360, 840)))
      .toEqual(ivs([[180, 360]]));
  });
  it("parse_hhmm", () => {
    expect(parseHhmm("22:00")).toBe(1320);
    expect(parseHhmm("00:00")).toBe(0);
    expect(parseHhmm("23:59")).toBe(1439);
    expect(codeOf(() => parseHhmm("24:00"))).toBe("INVALID_TIME");
    expect(codeOf(() => parseHhmm("7:00"))).toBe("INVALID_TIME");
  });
  it("merge_never_grows_and_is_idempotent", () => {
    fc.assert(fc.property(arbIntervals, (xs) => {
      const m = mergeIntervals(xs);
      const sum = xs.reduce((a, x) => a + x.end - x.start, 0);
      expect(totalMinutes(m)).toBeLessThanOrEqual(sum);
      expect(mergeIntervals(m)).toEqual(m);
    }));
  });
});
