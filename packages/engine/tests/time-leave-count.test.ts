import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "../src/dates";
import { countLeaveHalves } from "../src/time/leave-count";
import type { DayPart, LeaveCalendar, LeaveSpan } from "../src/time/types";

const EMPTY: LeaveCalendar = { restDates: new Set(), holidayDates: new Set() };

function span(start: string, end: string, startPart: DayPart = "full",
  endPart: DayPart = "full"): LeaveSpan {
  return { start, end, startPart, endPart };
}

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

describe("countLeaveHalves", () => {
  it("calendar_three_full_days", () => {
    const r = countLeaveHalves(span("2026-03-01", "2026-03-03"),
      "calendar", EMPTY);
    expect(r.halves).toBe(6);
    expect(r.dates.map((d) => d.halves)).toEqual([2, 2, 2]);
  });
  it("working_skips_rest_and_holiday", () => {
    const cal: LeaveCalendar = { restDates: new Set(["2026-03-02"]),
      holidayDates: new Set(["2026-03-03"]) };
    const s = span("2026-03-01", "2026-03-03");
    const r = countLeaveHalves(s, "working", cal);
    expect(r.halves).toBe(2);
    expect(r.dates).toEqual([{ date: "2026-03-01", halves: 2,
      part: "full" }]);
    expect(r.skipped).toEqual([
      { date: "2026-03-02", why: "rest-day" },
      { date: "2026-03-03", why: "holiday" },
    ]);
    expect(countLeaveHalves(s, "calendar", cal).halves).toBe(6);
  });
  it("rest_day_wins_over_holiday", () => {
    const cal: LeaveCalendar = { restDates: new Set(["2026-03-02"]),
      holidayDates: new Set(["2026-03-02"]) };
    const r = countLeaveHalves(span("2026-03-02", "2026-03-02"),
      "working", cal);
    expect(r.skipped).toEqual([{ date: "2026-03-02", why: "rest-day" }]);
  });
  it("single_am_is_one_half", () => {
    const r = countLeaveHalves(span("2026-03-01", "2026-03-01", "am",
      "am"), "calendar", EMPTY);
    expect(r.halves).toBe(1);
    expect(r.dates).toEqual([{ date: "2026-03-01", halves: 1,
      part: "am" }]);
  });
  it("pm_start_am_end_three_days", () => {
    const r = countLeaveHalves(span("2026-03-01", "2026-03-03", "pm",
      "am"), "calendar", EMPTY);
    expect(r.halves).toBe(4);
    expect(r.dates.map((d) => d.part)).toEqual(["pm", "full", "am"]);
  });
  it("part_on_skipped_date_dropped", () => {
    const cal: LeaveCalendar = { restDates: new Set(["2026-03-01"]),
      holidayDates: new Set() };
    const r = countLeaveHalves(span("2026-03-01", "2026-03-02", "pm",
      "full"), "working", cal);
    expect(r.halves).toBe(2);
  });
  it("invalid_parts", () => {
    expect(codeOf(() => countLeaveHalves(span("2026-03-01", "2026-03-01",
      "am", "pm"), "calendar", EMPTY))).toBe("INVALID_DAY_PART");
    expect(codeOf(() => countLeaveHalves(span("2026-03-01", "2026-03-03",
      "am", "full"), "calendar", EMPTY))).toBe("INVALID_DAY_PART");
    expect(codeOf(() => countLeaveHalves(span("2026-03-01", "2026-03-03",
      "full", "pm"), "calendar", EMPTY))).toBe("INVALID_DAY_PART");
  });
  it("end_before_start", () => {
    expect(codeOf(() => countLeaveHalves(span("2026-03-03", "2026-03-01"),
      "calendar", EMPTY))).toBe("INVALID_DATE");
  });
  it("leap_span", () => {
    expect(countLeaveHalves(span("2028-02-28", "2028-03-01"), "calendar",
      EMPTY).halves).toBe(6);
  });
  it("all_skipped_is_zero", () => {
    const cal: LeaveCalendar = {
      restDates: new Set(["2026-03-06", "2026-03-07"]),
      holidayDates: new Set(),
    };
    const r = countLeaveHalves(span("2026-03-06", "2026-03-07"), "working",
      cal);
    expect(r.halves).toBe(0);
    expect(r.dates).toEqual([]);
  });
  it("calendar_matches_plan3_days", () => {
    const arb = fc.tuple(fc.integer({ min: 0, max: 3650 }),
      fc.integer({ min: 0, max: 400 }));
    fc.assert(fc.property(arb, ([offset, len]) => {
      const start = addDays("2024-01-01", offset);
      const end = addDays(start, len);
      const r = countLeaveHalves(span(start, end), "calendar", EMPTY);
      expect(r.halves).toBe(2 * (daysBetween(start, end) + 1));
    }));
  });
});
