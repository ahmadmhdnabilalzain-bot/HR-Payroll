import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, fromDayNumber, toDayNumber } from "../src/dates";
import { addMonthsClamped } from "../src/employment/calendar";
import { calculateProbation } from "../src/employment/probation";
import { EMPLOYMENT_PACKS } from "../src/rules/employment-pack";

const P = EMPLOYMENT_PACKS;

function errOf(fn: () => unknown): { code: string;
  detail: Record<string, string> } {
  try {
    fn();
  } catch (e) {
    return e as { code: string; detail: Record<string, string> };
  }
  return { code: "NONE", detail: {} };
}

const probe = (joiningDate: string, probationMonths: number,
  ov?: Record<string, number>) =>
  calculateProbation({ joiningDate, probationMonths }, P, ov);

describe("calculateProbation", () => {
  it("probation_six_months", () => {
    const r = probe("2026-03-01", 6);
    expect(r.value).toEqual({ probationEndDate: "2026-08-31",
      employerNoticeDeadline: "2026-08-17" });
    expect(r.trace.map((l) => l.id)).toEqual([
      "employment.probation.end",
      "employment.probation.notice-deadline"]);
    const rule = r.trace[0]!.rules
      .find((x) => x.key === "empProbationMaxMonths");
    expect(rule?.status).toBe("official");
    expect(rule?.packId).toBe("ae-employment");
  });
  it("probation_clamps_month_end", () => {
    expect(probe("2026-01-31", 1).value.probationEndDate)
      .toBe("2026-02-27");
    expect(probe("2024-08-31", 6).value.probationEndDate)
      .toBe("2025-02-27");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
  });
  it("probation_zero_months", () => {
    const r = probe("2026-03-01", 0);
    expect(r.value).toEqual({ probationEndDate: null,
      employerNoticeDeadline: null });
    expect(r.trace.map((l) => l.id)).toEqual(["employment.probation.none"]);
  });
  it("probation_too_long", () => {
    const e = errOf(() => probe("2026-03-01", 7));
    expect(e.code).toBe("PROBATION_TOO_LONG");
    expect(e.detail.max).toBe("6");
    expect(e.detail.value).toBe("7");
    expect(errOf(() => probe("2026-03-01", -1)).code)
      .toBe("INVALID_PROBATION_MONTHS");
    expect(errOf(() => probe("2026-03-01", 1.5)).code)
      .toBe("INVALID_PROBATION_MONTHS");
  });
  it("probation_override_marks_overridden", () => {
    const ov = { empProbationMaxMonths: 3 };
    expect(errOf(() => probe("2026-03-01", 4, ov)).code)
      .toBe("PROBATION_TOO_LONG");
    const r = probe("2026-03-01", 3, ov);
    expect(r.trace[0]!.rules[0]!.key).toBe("empProbationMaxMonths");
    expect(r.trace[0]!.rules[0]!.overridden).toBe(true);
  });
  it("one month from mid-month ends the day before", () => {
    expect(probe("2026-03-10", 1).value).toEqual({
      probationEndDate: "2026-04-09",
      employerNoticeDeadline: "2026-03-26" });
  });
  it("refuses a bad months value for addMonthsClamped", () => {
    expect(errOf(() => addMonthsClamped("2024-01-31", -1)).code)
      .toBe("INVALID_MONTHS");
    expect(errOf(() => addMonthsClamped("2024-01-31", 0.5)).code)
      .toBe("INVALID_MONTHS");
    expect(addMonthsClamped("2024-11-30", 3)).toBe("2025-02-28");
  });
  it("probation_never_exceeds_max", () => {
    const lo = toDayNumber("2022-02-02");
    const hi = toDayNumber("2030-12-31");
    fc.assert(fc.property(fc.integer({ min: lo, max: hi }),
      fc.integer({ min: 1, max: 6 }), (day, months) => {
        const join = fromDayNumber(day);
        const end = probe(join, months).value.probationEndDate!;
        expect(end >= join).toBe(true);
        expect(end < addMonthsClamped(join, months)).toBe(true);
        expect(end).toBe(addDays(addMonthsClamped(join, months), -1));
      }));
  });
});
