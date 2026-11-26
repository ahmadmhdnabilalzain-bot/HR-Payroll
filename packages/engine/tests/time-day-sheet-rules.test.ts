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

const keys = (s: ReturnType<typeof sheet>, id: string) =>
  s.trace.find((l) => l.id === id)!.rules.map((r) => r.key);

describe("legal daily limit on shift days (review I1)", () => {
  it("long_shift_counts_hours_beyond_normal", () => {
    const s = sheet({ shift: shift(480, 1140, 60),
      worked: ivs([[480, 1140]]) });
    expect([s.scheduledMinutes, s.workedMinutes, s.overtimeMinutes])
      .toEqual([600, 600, 120]);
    expect(keys(s, "time.overtime")).toEqual(["timeMaxNormalMinutesPerDay"]);
  });
  it("ramadan_shift_counts_hours_beyond_reduced_day", () => {
    const s = sheet({ ramadan: true, shift: shift(540, 1080, 60),
      worked: ivs([[540, 1080]]) });
    expect(s.overtimeMinutes).toBe(120);
    expect(keys(s, "time.overtime")).toEqual(["timeMaxNormalMinutesPerDay",
      "timeRamadanReductionMinutes"]);
    const line = s.trace.find((l) => l.id === "time.overtime")!;
    expect(line.formula).toContain("not stated in ER 15(2)");
  });
  it("shift_within_limit_cites_no_limit", () => {
    const s = sheet({ shift: shift(540, 1080, 60),
      worked: ivs([[540, 1140]]) });
    expect(s.overtimeMinutes).toBe(60);
    expect(keys(s, "time.overtime")).toEqual([]);
  });
  it("long_night_shift_night_minutes_inside_the_shift", () => {
    // 16:00 to 04:00, break 60: net 660, 180 beyond the 480 limit.
    const s = sheet({ shift: shift(960, 1680, 60),
      worked: ivs([[960, 1680]]) });
    expect([s.overtimeMinutes, s.overtimeNightMinutes]).toEqual([180, 180]);
  });
});

describe("night overtime without a shift (review M5)", () => {
  it("night_minutes_worked_in_window_count", () => {
    // 20:00 to 09:00: overtime 300; 360 minutes fell in 22:00-04:00.
    const s = sheet({ worked: ivs([[1200, 1980]]) });
    expect([s.overtimeMinutes, s.overtimeNightMinutes]).toEqual([300, 300]);
  });
  it("night_capped_by_window_minutes", () => {
    const s = sheet({ worked: ivs([[600, 1380]]) });
    expect([s.overtimeMinutes, s.overtimeNightMinutes]).toEqual([300, 60]);
  });
});

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

const codes = (s: ReturnType<typeof sheet>) => s.flags.map((f) => f.code);

describe("overlong records (review I2)", () => {
  it("record_over_24_hours_is_a_missed_clock_out", () => {
    const s = sheet({ worked: ivs([[540, 2880]]) });
    expect([s.workedMinutes, s.overtimeMinutes]).toEqual([0, 0]);
    expect(codes(s)).toEqual(["MISSED_CLOCK_OUT", "LONG_RECORD"]);
    const f = s.flags.find((x) => x.code === "LONG_RECORD")!;
    expect(f.detail).toEqual({ start: "540", end: "2880",
      minutes: "2340" });
  });
  it("record_past_two_days_never_throws", () => {
    const s = sheet({ worked: ivs([[600, 700], [540, 3500]]) });
    expect(s.workedMinutes).toBe(100);
    expect(codes(s)).toContain("LONG_RECORD");
  });
  it("exactly_24_hours_is_kept", () => {
    const s = sheet({ worked: ivs([[540, 1980]]) });
    expect(s.workedMinutes).toBe(1440);
    expect(codes(s)).not.toContain("LONG_RECORD");
  });
  it("open_and_long_flag_missed_clock_out_once", () => {
    const s = sheet({ openRecord: true, worked: ivs([[0, 2000]]) });
    expect(codes(s).filter((c) => c === "MISSED_CLOCK_OUT").length)
      .toBe(1);
  });
});

describe("whole minutes only (review M7)", () => {
  it("fractional_interval_refused", () => {
    expect(() => sheet({ worked: ivs([[540.5, 1100]]) }))
      .toThrow(expect.objectContaining({ code: "INVALID_INTERVAL" }));
  });
  it("fractional_or_negative_shift_refused", () => {
    expect(() => sheet({ shift: shift(540, 1080.5, 60) }))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
    expect(() => sheet({ shift: shift(540, 1080, -1) }))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
    expect(() => sheet({ shift: shift(540, 1080, 0.5) }))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
  });
});
