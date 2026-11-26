import { EngineError } from "../errors";
import { boolParam, type Typed } from "../gratuity-params";
import { choiceParam } from "../payroll/params";
import { requireParam } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { traceRule } from "../trace";
import { parseHhmm } from "./intervals";

export type TimeOverrides = Record<string, ParamValue> | undefined;

export interface TimeParams {
  maxNormalMinutesPerDay: Typed<number>;
  maxNormalMinutesPerWeek: Typed<number>;
  ramadanReductionMinutes: Typed<number>;
  maxConsecutiveWorkMinutes: Typed<number>;
  minRestBreakMinutes: Typed<number>;
  overtimeMaxMinutesPerDay: Typed<number>;
  maxMinutesPer3Weeks: Typed<number>;
  /** Minutes from midnight; `end < start` crosses midnight. */
  nightWindow: Typed<{ start: number; end: number }>;
  maxConsecutiveRestDaysWorked: Typed<number>;
  minWeeklyRestDays: Typed<number>;
  holidayWorkCompensated: Typed<boolean>;
  annualLeaveMinDays: Typed<number>;
  firstYearDaysPerMonth: Typed<number>;
  carryOverMaxShareBps: Typed<number>;
  sickLeaveMaxDaysPerYear: Typed<number>;
  maternityLeaveDays: Typed<number>;
  weekBasis: Typed<"iso-monday">;
  leaveYear: Typed<"calendar-year">;
}

function invalid(key: string, value: ParamValue, want: string): never {
  throw new EngineError("INVALID_PARAM", `param ${key} must be ${want}`,
    { key, value: String(value) });
}

/** A whole number of at least `min` (0 unless stated). */
function minutesParam(pack: RulePack, key: string, ov: TimeOverrides,
  min = 0): Typed<number> {
  const p = requireParam(pack, key, ov);
  if (typeof p.value !== "number" || !Number.isSafeInteger(p.value) ||
    p.value < min) {
    invalid(key, p.value, `a whole number of at least ${min}`);
  }
  return { v: p.value, rule: traceRule(p) };
}

/** "HH:MM-HH:MM" as minutes from midnight. */
function windowParam(pack: RulePack, key: string, ov: TimeOverrides):
  Typed<{ start: number; end: number }> {
  const p = requireParam(pack, key, ov);
  const parts = typeof p.value === "string" ? p.value.split("-") : [];
  try {
    if (parts.length !== 2) throw new Error("shape");
    const [start, end] = parts.map((t) => parseHhmm(t));
    return { v: { start: start!, end: end! }, rule: traceRule(p) };
  } catch {
    return invalid(key, p.value, "HH:MM-HH:MM");
  }
}

export function loadTimeParams(pack: RulePack, ov: TimeOverrides):
  TimeParams {
  const m = (key: string) => minutesParam(pack, key, ov);
  return {
    maxNormalMinutesPerDay: m("timeMaxNormalMinutesPerDay"),
    maxNormalMinutesPerWeek: m("timeMaxNormalMinutesPerWeek"),
    ramadanReductionMinutes: m("timeRamadanReductionMinutes"),
    maxConsecutiveWorkMinutes: m("timeMaxConsecutiveWorkMinutes"),
    minRestBreakMinutes: m("timeMinRestBreakMinutes"),
    overtimeMaxMinutesPerDay: m("timeOvertimeMaxMinutesPerDay"),
    maxMinutesPer3Weeks: m("timeMaxMinutesPer3Weeks"),
    nightWindow: windowParam(pack, "timeNightWindow", ov),
    maxConsecutiveRestDaysWorked: m("timeMaxConsecutiveRestDaysWorked"),
    minWeeklyRestDays: m("timeMinWeeklyRestDays"),
    holidayWorkCompensated: boolParam(pack, "timeHolidayWorkCompensated",
      ov),
    annualLeaveMinDays: m("timeAnnualLeaveMinDays"),
    firstYearDaysPerMonth: m("timeFirstYearDaysPerMonth"),
    carryOverMaxShareBps: m("timeCarryOverMaxShareBps"),
    sickLeaveMaxDaysPerYear: m("timeSickLeaveMaxDaysPerYear"),
    maternityLeaveDays: m("timeMaternityLeaveDays"),
    weekBasis: choiceParam(pack, "timeWeekBasis", ov, ["iso-monday"]),
    leaveYear: choiceParam(pack, "timeLeaveYear", ov, ["calendar-year"]),
  };
}

/**
 * The company's retention period. The pack value is unsourced, so a
 * missing company value throws `UNSOURCED_PARAM`; below 1 day throws
 * `INVALID_PARAM`.
 */
export function loadWfhRetention(pack: RulePack, companyDays: number | null):
  Typed<number> {
  const key = "timeWfhRetentionDays";
  const ov = companyDays === null ? undefined : { [key]: companyDays };
  return minutesParam(pack, key, ov, 1);
}
