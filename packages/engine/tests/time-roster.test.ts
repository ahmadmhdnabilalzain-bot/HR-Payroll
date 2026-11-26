import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates";
import { TIME_PACKS } from "../src/rules/time-pack";
import { loadTimeParams } from "../src/time/params";
import { checkRoster } from "../src/time/roster-checks";
import type { RosterDayInput, ShiftSlot } from "../src/time/types";

const P = loadTimeParams(TIME_PACKS[0]!, undefined);

const slot = (start: number, end: number, breakMinutes: number):
  ShiftSlot => ({ start, end, breakMinutes });

function rday(date: string, over: Partial<RosterDayInput> = {}):
  RosterDayInput {
  return {
    date, slot: "rest", holiday: false, companyRestDay: false,
    ramadan: false, onApprovedLeave: false, ...over,
  };
}

/** Consecutive days from start, one entry per element of slots. */
function days(start: string, slots: RosterDayInput["slot"][],
  over: Partial<RosterDayInput> = {}): RosterDayInput[] {
  return slots.map((s, i) => rday(addDays(start, i), { ...over, slot: s }));
}

const flagsOf = (ds: RosterDayInput[]) =>
  checkRoster({ employeeId: "e1", days: ds }, P);
const withCode = (ds: RosterDayInput[], code: string) =>
  flagsOf(ds).filter((f) => f.code === code);

const STD = slot(540, 1020, 60);

describe("checkRoster", () => {
  it("seven_shifts_no_weekly_rest", () => {
    const seven = days("2026-03-04", Array(7).fill(STD));
    const hits = withCode(seven, "NO_WEEKLY_REST");
    expect(hits.length).toBe(1);
    expect(hits[0]!.dates).toEqual(seven.map((d) => d.date));
    expect(hits[0]!.rule?.key).toBe("timeMinWeeklyRestDays");
    const rested = days("2026-03-04",
      [STD, STD, STD, "rest", STD, STD, STD]);
    expect(withCode(rested, "NO_WEEKLY_REST")).toEqual([]);
  });
  it("null_slot_breaks_run_and_long_run_flags_once", () => {
    const withNull = days("2026-03-04",
      [STD, STD, STD, null, STD, STD, STD]);
    expect(withCode(withNull, "NO_WEEKLY_REST")).toEqual([]);
    const nine = withCode(days("2026-03-04", Array(9).fill(STD)),
      "NO_WEEKLY_REST");
    expect(nine.length).toBe(1);
    expect(nine[0]!.dates.length).toBe(9);
  });
  it("shift_over_normal_hours", () => {
    const long = withCode(days("2026-03-02", [slot(540, 1140, 60)]),
      "SHIFT_OVER_NORMAL_HOURS");
    expect(long.length).toBe(1);
    expect(long[0]!.rule?.key).toBe("timeMaxNormalMinutesPerDay");
    const ram = withCode(days("2026-03-02", [STD], { ramadan: true }),
      "SHIFT_OVER_NORMAL_HOURS");
    expect(ram.length).toBe(1);
    expect(ram[0]!.rule?.key).toBe("timeRamadanReductionMinutes");
    expect(withCode(days("2026-03-02", [STD]), "SHIFT_OVER_NORMAL_HOURS"))
      .toEqual([]);
  });
  it("week_over_48_hours", () => {
    const week = days("2026-03-02", Array(5).fill(slot(480, 1140, 60)));
    const hits = withCode(week, "WEEK_OVER_48_HOURS");
    expect(hits.length).toBe(1);
    expect(hits[0]!.detail.minutes).toBe("3000");
    expect(hits[0]!.rule?.key).toBe("timeMaxNormalMinutesPerWeek");
  });
  it("iso_week_is_monday_to_sunday", () => {
    const monSun = withCode(days("2026-03-02", Array(7).fill(STD)),
      "WEEK_OVER_48_HOURS");
    expect(monSun.length).toBe(1);
    expect(monSun[0]!.dates[0]).toBe("2026-03-02");
    expect(monSun[0]!.dates[6]).toBe("2026-03-08");
    expect(withCode(days("2026-03-03", Array(7).fill(STD)),
      "WEEK_OVER_48_HOURS")).toEqual([]);
  });
  it("no_break_after_5_hours", () => {
    const code = "NO_BREAK_AFTER_5_HOURS";
    expect(withCode(days("2026-03-02", [slot(540, 900, 30)]), code).length)
      .toBe(1);
    expect(withCode(days("2026-03-02", [slot(540, 900, 60)]), code))
      .toEqual([]);
    expect(withCode(days("2026-03-02", [slot(540, 840, 0)]), code))
      .toEqual([]);
  });
  it("holiday_and_leave_flags", () => {
    const hol = withCode(days("2026-03-02", [STD], { holiday: true }),
      "HOLIDAY_SHIFT");
    expect(hol.length).toBe(1);
    expect(hol[0]!.rule?.key).toBe("timeHolidayWorkCompensated");
    const leave = withCode(days("2026-03-02", [STD],
      { onApprovedLeave: true }), "ON_APPROVED_LEAVE");
    expect(leave.length).toBe(1);
    expect(leave[0]!.rule).toBeNull();
  });
  it("consecutive_rest_days_worked", () => {
    const weeks = (worked: number) => Array.from({ length: 21 }, (_, i) => {
      const rest = i % 7 === 6;
      const week = Math.floor(i / 7);
      const s = rest && week >= worked ? "rest" : STD;
      return rday(addDays("2026-03-02", i),
        { companyRestDay: rest, slot: s });
    });
    const three = withCode(weeks(3), "CONSECUTIVE_REST_DAYS_WORKED");
    expect(three.length).toBe(1);
    expect(three[0]!.dates)
      .toEqual(["2026-03-08", "2026-03-15", "2026-03-22"]);
    expect(three[0]!.rule?.key).toBe("timeMaxConsecutiveRestDaysWorked");
    const two = Array.from({ length: 14 }, (_, i) =>
      rday(addDays("2026-03-02", i), { companyRestDay: i % 7 === 6,
        slot: STD }));
    expect(withCode(two, "CONSECUTIVE_REST_DAYS_WORKED")).toEqual([]);
  });
  it("adjacent_rest_days_count_as_consecutive", () => {
    const ds = days("2026-03-06", [STD, STD, STD],
      { companyRestDay: true });
    expect(withCode(ds, "CONSECUTIVE_REST_DAYS_WORKED").length).toBe(1);
  });
  it("roster_days_must_be_consecutive", () => {
    const gap = [rday("2026-03-02"), rday("2026-03-04")];
    expect(() => flagsOf(gap))
      .toThrow(expect.objectContaining({ code: "INVALID_ROSTER_DAYS" }));
  });
  it("invalid_slot_refused", () => {
    expect(() => flagsOf(days("2026-03-02", [slot(540, 600, 120)])))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
    expect(() => flagsOf(days("2026-03-02", [slot(540, 600.5, 0)])))
      .toThrow(expect.objectContaining({ code: "INVALID_SHIFT" }));
  });
  it("empty_roster_no_flags", () => {
    expect(flagsOf([])).toEqual([]);
  });
});
