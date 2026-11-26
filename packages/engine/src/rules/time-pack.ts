import { deepFreeze } from "../freeze";
import { sourceOf } from "../sources";
import type { ParamValue, RuleParam, RulePack, RuleStatus } from "./types";

function param(
  value: ParamValue,
  status: Exclude<RuleStatus, "unsourced">,
  sourceId: string,
): RuleParam {
  return { value, status, source: sourceOf(sourceId) };
}

const o = "official";
const c = "convention";
const EC = "ENGINE_CONVENTION";

/** Working hours, DL Arts 17 and 18, ER Art 15(2). */
const HOURS: Record<string, RuleParam> = {
  // 17(1): "eight (8) hours per day or forty-eight (48) hours per week".
  timeMaxNormalMinutesPerDay: param(480, o, "DL33_ART17"),
  timeMaxNormalMinutesPerWeek: param(2880, o, "DL33_ART17"),
  // ER 15(2): "reduced by two hours during the holy month of Ramadan".
  timeRamadanReductionMinutes: param(120, o, "ER1_2022_ART15"),
  // 18: "five (5) consecutive hours without a rest period or periods
  // amounting in aggregate to not less than one hour".
  timeMaxConsecutiveWorkMinutes: param(300, o, "DL33_ART18"),
  timeMinRestBreakMinutes: param(60, o, "DL33_ART18"),
};

/** Overtime and rest days, DL Arts 19, 21 and 28. */
const OVERTIME: Record<string, RuleParam> = {
  // 19(1): "do not exceed two hours per day"; a flag, never a cut.
  timeOvertimeMaxMinutesPerDay: param(120, o, "DL33_ART19"),
  // 19(1): "one hundred and forty-four (144) hours every (3) three weeks".
  timeMaxMinutesPer3Weeks: param(8640, o, "DL33_ART19"),
  // 19(3): "between 10 pm and 4 am".
  timeNightWindow: param("22:00-04:00", o, "DL33_ART19"),
  // 19(5): no more than two consecutive rest days of work.
  timeMaxConsecutiveRestDaysWorked: param(2, o, "DL33_ART19"),
  // 21: "paid weekly rest not less than one day".
  timeMinWeeklyRestDays: param(1, o, "DL33_ART21"),
  // 28(2): work on an official holiday earns a rest day or pay.
  timeHolidayWorkCompensated: param(true, o, "DL33_ART28"),
};

/** Leave, DL Arts 29 to 31, ER Art 19(1). */
const LEAVE: Record<string, RuleParam> = {
  // 29(1)(a): "Thirty days for each year of his extended service".
  timeAnnualLeaveMinDays: param(30, o, "DL33_ART29"),
  // 29(1)(b): "Two days for each month" between six months and a year.
  timeFirstYearDaysPerMonth: param(2, o, "DL33_ART29"),
  // ER 19(1): carry forward "what does not exceed half of the annual
  // leave".
  timeCarryOverMaxShareBps: param(5000, o, "ER1_2022_ART19"),
  // 31(3): "no more than (90) ninety consecutive or intermittent days".
  timeSickLeaveMaxDaysPerYear: param(90, o, "DL33_ART31"),
  // 30(1): "maternity leave of (60) sixty days".
  timeMaternityLeaveDays: param(60, o, "DL33_ART30"),
};

/** Engine conventions and the unsourced retention period. */
const OTHER: Record<string, RuleParam> = {
  timeWeekBasis: param("iso-monday", c, EC),
  timeLeaveYear: param("calendar-year", c, EC),
  // PDPL sets no period; the company must enter one (Ruling 21).
  timeWfhRetentionDays: { value: null, status: "unsourced", source: null },
};

/** Time, attendance and leave, Federal Decree-Law 33 of 2021. */
const AE_TIME_2022: RulePack = {
  id: "ae-time",
  version: "2022-02-02",
  effectiveFrom: "2022-02-02",
  effectiveTo: null,
  params: { ...HOURS, ...OVERTIME, ...LEAVE, ...OTHER },
};

/** Frozen, with every param and source. */
export const TIME_PACKS: readonly RulePack[] = deepFreeze([AE_TIME_2022]);
