import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addMonthsClamped,
  parseWeekend,
  rollToBusinessDay,
  vatPeriods,
  vatReturnDue,
  weekday,
} from "../src/index";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

const WEEKEND = parseWeekend("SAT,SUN");

describe("tax calendar", () => {
  it("weekday", () => {
    expect(weekday("1970-01-01")).toBe(4);
    expect(weekday("2026-11-26")).toBe(4);
    expect(weekday("2026-11-28")).toBe(6);
    expect(weekday("2026-11-29")).toBe(0);
    expect(weekday("1969-12-31")).toBe(3);
  });
  it("parse_weekend", () => {
    expect([...WEEKEND].sort()).toEqual([0, 6]);
    expect([...parseWeekend("FRI")]).toEqual([5]);
    expect(codeOf(() => parseWeekend("SAT,XYZ"))).toBe("INVALID_PARAM");
    expect(codeOf(() => parseWeekend(""))).toBe("INVALID_PARAM");
  });
  it("add_months_clamped", () => {
    expect(addMonthsClamped("2027-03-31", 1)).toBe("2027-04-30");
    expect(addMonthsClamped("2026-12-31", 9)).toBe("2027-09-30");
    expect(addMonthsClamped("2026-12-31", 0)).toBe("2026-12-31");
  });
  it("add_business_days", () => {
    expect(addBusinessDays("2026-11-26", 2, WEEKEND, []))
      .toBe("2026-11-30");
    expect(addBusinessDays("2026-11-26", 2, WEEKEND, ["2026-11-27"]))
      .toBe("2026-12-01");
    expect(addBusinessDays("2026-11-26", 0, WEEKEND, []))
      .toBe("2026-11-26");
    expect(codeOf(() => addBusinessDays("2026-11-26", -1, WEEKEND, [])))
      .toBe("INVALID_COUNT");
  });
  it("roll_to_business_day", () => {
    expect(rollToBusinessDay("2026-11-28", WEEKEND, [])).toBe("2026-11-30");
    expect(rollToBusinessDay("2026-11-26", WEEKEND, [])).toBe("2026-11-26");
    expect(codeOf(() => rollToBusinessDay("2026-11-28", WEEKEND,
      ["2026-13-01"]))).toBe("INVALID_DATE");
    const all = parseWeekend("SUN,MON,TUE,WED,THU,FRI,SAT");
    expect(codeOf(() => rollToBusinessDay("2026-11-28", all, [])))
      .toBe("INVALID_PARAM");
  });
});

describe("VAT periods", () => {
  it("quarterly_periods", () => {
    const p = vatPeriods("2026-01-01", 3, "2026-01-01", "2026-12-31");
    expect(p).toHaveLength(4);
    expect(p[1]).toEqual({ start: "2026-04-01", end: "2026-06-30" });
    expect(p[3]).toEqual({ start: "2026-10-01", end: "2026-12-31" });
  });
  it("overlap_only", () => {
    const p = vatPeriods("2025-02-01", 3, "2026-03-15", "2026-03-20");
    expect(p).toEqual([{ start: "2026-02-01", end: "2026-04-30" }]);
    expect(vatPeriods("2027-01-01", 1, "2026-01-01", "2026-12-31"))
      .toEqual([]);
  });
  it("monthly_february", () => {
    const p = vatPeriods("2028-01-01", 1, "2028-02-01", "2028-02-29");
    expect(p).toEqual([{ start: "2028-02-01", end: "2028-02-29" }]);
  });
  it("first_period_day_1_only", () => {
    expect(codeOf(() => vatPeriods("2026-01-15", 3, "2026-01-01",
      "2026-12-31"))).toBe("INVALID_DATE");
  });
  it("range_limits", () => {
    expect(vatPeriods("2016-01-01", 1, "2016-01-01", "2025-12-31"))
      .toHaveLength(120);
    expect(codeOf(() => vatPeriods("2016-01-01", 1, "2016-01-01",
      "2026-01-01"))).toBe("RANGE_TOO_LONG");
    expect(codeOf(() => vatPeriods("2026-01-01", 1, "2026-02-01",
      "2026-01-01"))).toBe("INVALID_PERIOD");
    expect(codeOf(() => vatPeriods("2026-01-01", 2 as 1, "2026-01-01",
      "2026-02-01"))).toBe("INVALID_PARAM");
  });
});

describe("VAT return due date", () => {
  it("due_rolls_from_saturday", () => {
    const r = vatReturnDue("2026-10-31", []);
    expect(r.value).toEqual({ unrolledDate: "2026-11-28",
      dueDate: "2026-11-30", rolled: true });
    expect(r.trace[0]!.id).toBe("vat.return.due");
    expect(r.trace[0]!.rules.map((x) => x.key)).toEqual([
      "returnDueDaysAfterPeriodEnd", "returnDueRollsToNextBusinessDay",
      "weekendDays"]);
  });
  it("due_rolls_past_holiday", () => {
    expect(vatReturnDue("2026-10-31", ["2026-11-30"]).value.dueDate)
      .toBe("2026-12-01");
  });
  it("due_weekday_unrolled", () => {
    expect(weekday("2026-10-28")).toBe(3);
    expect(vatReturnDue("2026-09-30", []).value).toEqual({
      unrolledDate: "2026-10-28", dueDate: "2026-10-28", rolled: false });
  });
});
