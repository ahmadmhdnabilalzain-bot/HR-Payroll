import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates";
import { TIME_PACKS } from "../src/rules/time-pack";
import { computeDaySheet, periodHourFlags } from "../src/time/day-sheet";
import type { Interval } from "../src/time/intervals";
import { loadTimeParams } from "../src/time/params";
import type { DayInput, LeavePart, ShiftSlot } from "../src/time/types";

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

const codes = (d: DayInput) =>
  computeDaySheet(d, P).flags.map((f) => f.code);

describe("computeDaySheet", () => {
  it("full_shift_no_overtime", () => {
    const s = computeDaySheet(day({ shift: shift(540, 1080, 60),
      worked: ivs([[540, 1080]]) }), P);
    expect([s.scheduledMinutes, s.workedMinutes, s.overtimeMinutes])
      .toEqual([480, 480, 0]);
  });
  it("overtime_after_shift_with_night", () => {
    const s = computeDaySheet(day({ shift: shift(840, 1320, 0),
      worked: ivs([[840, 1440]]) }), P);
    expect([s.overtimeMinutes, s.overtimeNightMinutes]).toEqual([120, 120]);
  });
  it("night_overtime_across_midnight", () => {
    const s = computeDaySheet(day({ shift: shift(960, 1440, 0),
      worked: ivs([[960, 1560]]) }), P);
    expect([s.workedMinutes, s.overtimeMinutes, s.overtimeNightMinutes])
      .toEqual([600, 120, 120]);
    expect(s.date).toBe("2026-03-02");
  });
  it("early_start_overtime_partly_night", () => {
    const s = computeDaySheet(day({ shift: shift(360, 840, 0),
      worked: ivs([[180, 840]]) }), P);
    expect([s.overtimeMinutes, s.overtimeNightMinutes]).toEqual([180, 60]);
  });
  it("no_shift_overtime_tail", () => {
    const s = computeDaySheet(day({ worked: ivs([[600, 1380]]) }), P);
    expect([s.overtimeMinutes, s.overtimeNightMinutes]).toEqual([300, 60]);
  });
  it("ramadan_no_shift_limit_reduced", () => {
    const s = computeDaySheet(day({ ramadan: true,
      worked: ivs([[540, 960]]) }), P);
    expect(s.overtimeMinutes).toBe(60);
    const line = s.trace.find((l) => l.id === "time.overtime")!;
    expect(line.rules.map((r) => r.key))
      .toContain("timeRamadanReductionMinutes");
  });
  it("rest_day_work", () => {
    const s = computeDaySheet(day({ kind: "rest",
      worked: ivs([[540, 780]]) }), P);
    expect([s.restDayWorkMinutes, s.overtimeMinutes]).toEqual([240, 0]);
  });
  it("late_and_early", () => {
    const s = computeDaySheet(day({ shift: shift(540, 1080, 60),
      worked: ivs([[560, 1060]]) }), P);
    expect([s.lateMinutes, s.earlyLeaveMinutes, s.overtimeMinutes])
      .toEqual([20, 20, 0]);
  });
  it("half_day_am_leave_halves_schedule", () => {
    const s = computeDaySheet(day({ leave: "am",
      shift: shift(540, 1080, 60), worked: ivs([[840, 1080]]) }), P);
    expect([s.scheduledMinutes, s.workedMinutes, s.lateMinutes])
      .toEqual([240, 240, 0]);
  });
  it("overtime_cap_flag_never_cuts", () => {
    const s = computeDaySheet(day({ shift: shift(540, 1020, 0),
      worked: ivs([[540, 1200]]) }), P);
    expect(s.overtimeMinutes).toBe(180);
    const f = s.flags.find((x) => x.code === "OVERTIME_DAILY_CAP_EXCEEDED");
    expect(f?.detail.minutes).toBe("180");
    expect(f?.rule?.key).toBe("timeOvertimeMaxMinutesPerDay");
  });
  it("open_record_flag_not_overtime", () => {
    const d = day({ openRecord: true, worked: [] });
    expect(computeDaySheet(d, P).overtimeMinutes).toBe(0);
    expect(codes(d)).toEqual(["MISSED_CLOCK_OUT"]);
  });
  it("work_on_full_leave_day_flagged", () => {
    const d = day({ leave: "full", worked: ivs([[540, 600]]) });
    expect(computeDaySheet(d, P).overtimeMinutes).toBe(0);
    expect(codes(d)).toEqual(["WORK_ON_LEAVE_DAY"]);
  });
  it("trace_has_one_line_per_field", () => {
    const s = computeDaySheet(day({ worked: ivs([[540, 600]]) }), P);
    expect(s.trace.map((l) => l.id)).toEqual(["time.scheduled",
      "time.worked", "time.late", "time.early", "time.overtime",
      "time.overtimeNight", "time.restDayWork"]);
  });
  it("trace_inputs_reproduce_numbers", () => {
    const s = computeDaySheet(day({ shift: shift(540, 1080, 60),
      worked: ivs([[560, 1200]]) }), P);
    const by = (id: string) => s.trace.find((l) => l.id === id)!;
    expect(by("time.late").inputs.firstStart).toBe("560");
    expect(by("time.late").inputs.shiftStart).toBe("540");
    expect(by("time.early").inputs.lastEnd).toBe("1200");
    expect(by("time.overtime").inputs.scheduled).toBe("480");
    expect(by("time.overtime").inputs.worked).toBe("580");
    expect(by("time.overtimeNight").rules.map((r) => r.key))
      .toEqual(["timeNightWindow"]);
  });
  it("full_leave_on_rest_day_is_rest_day_work", () => {
    const d = day({ kind: "rest", leave: "full", worked: ivs([[540, 600]]) });
    expect(computeDaySheet(d, P).restDayWorkMinutes).toBe(60);
    expect(codes(d)).toEqual([]);
  });
  it("invalid_shift_refused", () => {
    expect(() => computeDaySheet(day({ shift: shift(600, 600, 0) }), P))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
    expect(() => computeDaySheet(day({ shift: shift(600, 700, 120) }), P))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
  });
  it("invalid_interval_refused", () => {
    expect(() => computeDaySheet(day({ worked: ivs([[600, 600]]) }), P))
      .toThrow(expect.objectContaining({ code: "INVALID_INTERVAL" }));
  });
});

const arbShift = fc.tuple(fc.integer({ min: 0, max: 1439 }),
  fc.integer({ min: 1, max: 1440 }), fc.integer({ min: 0, max: 1440 }))
  .map(([s, len, b]) => shift(s, s + len, Math.min(b, len)));
const arbWorked = fc.array(fc.tuple(fc.integer({ min: -1440, max: 2879 }),
  fc.integer({ min: 1, max: 900 }))
  .map(([s, len]) => ({ start: s, end: Math.min(2880, s + len) })),
{ maxLength: 3 });
const arbDay = fc.record({
  date: fc.constant("2026-03-02"),
  kind: fc.constantFrom("work", "rest", "holiday") as
    fc.Arbitrary<DayInput["kind"]>,
  shift: fc.option(arbShift, { nil: null }),
  worked: arbWorked,
  openRecord: fc.boolean(),
  ramadan: fc.boolean(),
  leave: fc.constantFrom("none", "am", "pm", "full") as
    fc.Arbitrary<LeavePart>,
});

describe("day sheet properties", () => {
  it("day_sheet_invariants", () => {
    fc.assert(fc.property(arbDay, (d) => {
      const s = computeDaySheet(d, P);
      expect(s.overtimeNightMinutes).toBeGreaterThanOrEqual(0);
      expect(s.overtimeNightMinutes).toBeLessThanOrEqual(s.overtimeMinutes);
      expect(s.overtimeMinutes).toBeLessThanOrEqual(s.workedMinutes);
      expect(computeDaySheet(d, P)).toEqual(s);
    }), { numRuns: 200 });
  });
});

describe("periodHourFlags", () => {
  const run = (n: number) => Array.from({ length: n }, (_, i) =>
    ({ date: addDays("2026-03-01", i), workedMinutes: 420 }));
  it("three_week_cap", () => {
    const flags = periodHourFlags(run(21), P);
    expect(flags.map((f) => f.code)).toEqual(["HOURS_144_IN_3_WEEKS"]);
    expect(flags[0]!.dates).toEqual(["2026-03-01", "2026-03-21"]);
    expect(flags[0]!.rule?.key).toBe("timeMaxMinutesPer3Weeks");
    expect(periodHourFlags(run(20), P)).toEqual([]);
  });
  it("run_of_windows_gives_one_flag", () => {
    const flags = periodHourFlags(run(23), P);
    expect(flags.length).toBe(1);
    expect(flags[0]!.dates).toEqual(["2026-03-01", "2026-03-23"]);
  });
  it("missing_dates_count_as_zero", () => {
    const days = run(21).filter((d) => d.date !== "2026-03-11");
    expect(periodHourFlags(days, P)).toEqual([]);
    const heavier = days.map((d) => ({ ...d, workedMinutes: 440 }));
    const flags = periodHourFlags(heavier, P);
    expect(flags.length).toBe(1);
    expect(flags[0]!.detail.minutes).toBe("8800");
  });
});
