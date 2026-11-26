import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { TIME_PACKS } from "../src/rules/time-pack";
import { computeDaySheet } from "../src/time/day-sheet";
import type { Interval } from "../src/time/intervals";
import { loadTimeParams } from "../src/time/params";
import type { DayInput, ShiftSlot } from "../src/time/types";

const P = loadTimeParams(TIME_PACKS[0]!, undefined);

const ivs = (xs: [number, number][]): Interval[] =>
  xs.map(([start, end]) => ({ start, end }));

function day(over: Partial<DayInput>): DayInput {
  return {
    date: "2026-03-02", kind: "work", shift: null, worked: [],
    openRecord: false, ramadan: false, leave: "none", ...over,
  };
}

const shift = (start: number, end: number, breakMinutes: number):
  ShiftSlot => ({ start, end, breakMinutes });

const sheet = (over: Partial<DayInput>) => computeDaySheet(day(over), P);

describe("rostered break (review C1)", () => {
  it("break_clocked_out_not_double_counted", () => {
    const s = sheet({ shift: shift(540, 1080, 60),
      worked: ivs([[540, 780], [840, 1140]]) });
    expect([s.workedMinutes, s.overtimeMinutes]).toEqual([540, 60]);
  });
  it("short_clocked_gap_assumes_the_rest", () => {
    const s = sheet({ shift: shift(540, 1080, 60),
      worked: ivs([[540, 760], [780, 1080]]) });
    expect(s.workedMinutes).toBe(480);
  });
  it("gap_counts_only_inside_the_shift", () => {
    const s = sheet({ shift: shift(540, 1080, 60),
      worked: ivs([[300, 400], [500, 1080]]) });
    // Gap 400-500 is before the shift: 0 counted, 60 assumed.
    expect(s.workedMinutes).toBe(680 - 60);
  });
  it("worked_rises_with_clocked_near_the_break", () => {
    const at = (end: number) => sheet({ shift: shift(540, 1080, 60),
      worked: ivs([[540, end]]) }).workedMinutes;
    expect([at(600), at(601), at(602)]).toEqual([0, 1, 2]);
  });
  it("worked_never_falls_as_clocked_rises", () => {
    const arbIv = fc.tuple(fc.integer({ min: 0, max: 1800 }),
      fc.integer({ min: 1, max: 600 }))
      .map(([a, len]) => ({ start: a, end: a + len }));
    const arb = fc.record({
      start: fc.integer({ min: 0, max: 1200 }),
      len: fc.integer({ min: 60, max: 720 }),
      brk: fc.integer({ min: 0, max: 120 }),
      worked: fc.array(arbIv, { maxLength: 3 }),
      extra: arbIv,
      ramadan: fc.boolean(),
    });
    fc.assert(fc.property(arb, (a) => {
      const sh = shift(a.start, a.start + a.len, Math.min(a.brk, a.len - 1));
      const base = sheet({ shift: sh, worked: a.worked, ramadan: a.ramadan });
      const more = sheet({ shift: sh, worked: [...a.worked, a.extra],
        ramadan: a.ramadan });
      expect(more.workedMinutes).toBeGreaterThanOrEqual(base.workedMinutes);
      expect(more.overtimeMinutes)
        .toBeGreaterThanOrEqual(base.overtimeMinutes);
    }), { numRuns: 300 });
  });
});
