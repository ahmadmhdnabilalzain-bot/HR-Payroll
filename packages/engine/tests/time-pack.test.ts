import { describe, expect, it } from "vitest";
import * as engine from "../src/index";
import { TIME_PACKS } from "../src/rules/time-pack";
import type { RulePack } from "../src/rules/types";
import { sourceOf } from "../src/sources";
import { loadTimeParams, loadWfhRetention } from "../src/time/params";

const PACK = TIME_PACKS[0]!;

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

/** The plan's table: key, status, source id. */
const TABLE: [string, string, string | null][] = [
  ["timeMaxNormalMinutesPerDay", "official", "DL33_ART17"],
  ["timeMaxNormalMinutesPerWeek", "official", "DL33_ART17"],
  ["timeRamadanReductionMinutes", "official", "ER1_2022_ART15"],
  ["timeMaxConsecutiveWorkMinutes", "official", "DL33_ART18"],
  ["timeMinRestBreakMinutes", "official", "DL33_ART18"],
  ["timeOvertimeMaxMinutesPerDay", "official", "DL33_ART19"],
  ["timeMaxMinutesPer3Weeks", "official", "DL33_ART19"],
  ["timeNightWindow", "official", "DL33_ART19"],
  ["timeMaxConsecutiveRestDaysWorked", "official", "DL33_ART19"],
  ["timeMinWeeklyRestDays", "official", "DL33_ART21"],
  ["timeHolidayWorkCompensated", "official", "DL33_ART28"],
  ["timeAnnualLeaveMinDays", "official", "DL33_ART29"],
  ["timeFirstYearDaysPerMonth", "official", "DL33_ART29"],
  ["timeCarryOverMaxShareBps", "official", "ER1_2022_ART19"],
  ["timeSickLeaveMaxDaysPerYear", "official", "DL33_ART31"],
  ["timeMaternityLeaveDays", "official", "DL33_ART30"],
  ["timeWeekBasis", "convention", "ENGINE_CONVENTION"],
  ["timeLeaveYear", "convention", "ENGINE_CONVENTION"],
  ["timeWfhRetentionDays", "unsourced", null],
];

const VALUES: Record<string, unknown> = {
  timeMaxNormalMinutesPerDay: 480, timeMaxNormalMinutesPerWeek: 2880,
  timeRamadanReductionMinutes: 120, timeMaxConsecutiveWorkMinutes: 300,
  timeMinRestBreakMinutes: 60, timeOvertimeMaxMinutesPerDay: 120,
  timeMaxMinutesPer3Weeks: 8640, timeNightWindow: "22:00-04:00",
  timeMaxConsecutiveRestDaysWorked: 2, timeMinWeeklyRestDays: 1,
  timeHolidayWorkCompensated: true, timeAnnualLeaveMinDays: 30,
  timeFirstYearDaysPerMonth: 2, timeCarryOverMaxShareBps: 5000,
  timeSickLeaveMaxDaysPerYear: 90, timeMaternityLeaveDays: 60,
  timeWeekBasis: "iso-monday", timeLeaveYear: "calendar-year",
  timeWfhRetentionDays: null,
};

function isPackArray(v: unknown): v is readonly RulePack[] {
  return Array.isArray(v) && v.length > 0 && v.every((p) =>
    typeof p === "object" && p !== null && "params" in p && "id" in p);
}

describe("ae-time pack", () => {
  it("loads_typed_params", () => {
    const p = loadTimeParams(PACK, undefined);
    expect(p.maxNormalMinutesPerDay.v).toBe(480);
    expect(p.maxNormalMinutesPerDay.rule.status).toBe("official");
    expect(p.nightWindow.v).toEqual({ start: 1320, end: 240 });
    expect(p.weekBasis.rule.status).toBe("convention");
    expect(p.leaveYear.rule.status).toBe("convention");
    expect(p.holidayWorkCompensated.v).toBe(true);
  });
  it("table_statuses_sources_values", () => {
    expect(Object.keys(PACK.params).sort())
      .toEqual(TABLE.map(([k]) => k).sort());
    for (const [key, status, src] of TABLE) {
      const param = PACK.params[key]!;
      expect(param.status, key).toBe(status);
      expect(param.value, key).toBe(VALUES[key]);
      if (src === null) expect(param.source, key).toBeNull();
      else expect(param.source, key).toEqual(sourceOf(src));
    }
  });
  it("pack_identity_and_frozen", () => {
    expect(PACK.id).toBe("ae-time");
    expect(PACK.version).toBe("2022-02-02");
    expect(PACK.effectiveFrom).toBe("2022-02-02");
    expect(PACK.effectiveTo).toBeNull();
    expect(Object.isFrozen(PACK.params)).toBe(true);
    expect(Object.isFrozen(TIME_PACKS)).toBe(true);
  });
  it("wfh_retention_has_no_default", () => {
    expect(codeOf(() => loadWfhRetention(PACK, null)))
      .toBe("UNSOURCED_PARAM");
    const r = loadWfhRetention(PACK, 90);
    expect(r.v).toBe(90);
    expect(r.rule.overridden).toBe(true);
    expect(codeOf(() => loadWfhRetention(PACK, 0))).toBe("INVALID_PARAM");
    expect(codeOf(() => loadWfhRetention(PACK, 1.5)))
      .toBe("INVALID_PARAM");
  });
  it("bad_overrides_refused", () => {
    expect(codeOf(() => loadTimeParams(PACK,
      { timeNightWindow: "22:00" }))).toBe("INVALID_PARAM");
    expect(codeOf(() => loadTimeParams(PACK,
      { timeMaxNormalMinutesPerDay: -1 }))).toBe("INVALID_PARAM");
    expect(codeOf(() => loadTimeParams(PACK,
      { timeWeekBasis: "sunday" }))).toBe("INVALID_PARAM");
  });
  it("no_key_shared_with_other_packs", () => {
    const others = Object.values(engine).filter(isPackArray).flat()
      .filter((p) => p.id !== "ae-time");
    expect(others.length).toBeGreaterThan(0);
    const mine = Object.keys(PACK.params);
    for (const other of others) {
      for (const key of Object.keys(other.params)) {
        expect(mine.includes(key), `${other.id}.${key}`).toBe(false);
      }
    }
    expect(Object.values(engine).some((v) => v === TIME_PACKS)).toBe(true);
  });
});
