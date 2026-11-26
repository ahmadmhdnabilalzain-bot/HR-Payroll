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
const CONV = "ENGINE_CONVENTION";

/** Statutory pay values of Decree-Law 33/2021 for the monthly payslip. */
const OVERTIME: Record<string, RuleParam> = {
  // 19(2): "plus an increase of at least twenty-five percent (25%)".
  overtimeUpliftBps: param(2500, o, "DL33_ART19"),
  // 19(3): "between 10 pm and 4 am ... at least fifty percent (50%)".
  nightOvertimeUpliftBps: param(5000, o, "DL33_ART19"),
  nightWindow: param("22:00-04:00", o, "DL33_ART19"),
  // 19(3): "Shift Workers shall be excluded from the above."
  shiftWorkersNightExcluded: param(true, o, "DL33_ART19"),
  // 19(1): "do not exceed two hours per day". Flagged, pay not cut.
  overtimeMaxMinutesPerDay: param(120, o, "DL33_ART19"),
  // 19(1): "144 hours every (3) three weeks". Cited, not checked.
  maxHoursPer3Weeks: param(144, o, "DL33_ART19"),
  // 17(1): "eight (8) hours per day".
  maxNormalHoursPerDay: param(8, o, "DL33_ART17"),
  // 19(4): "plus an increase not less than fifty percent (50%) of the
  // basic wage for that day".
  restDayUpliftBps: param(5000, o, "DL33_ART19"),
  // 28(2): the same wording for work on an official holiday.
  holidayUpliftBps: param(5000, o, "DL33_ART28"),
  // Our reading of 19(4): the monthly salary already pays the rest day.
  restDayPayMode: param("extra-day-wage-plus-premium", c, "DL33_ART19"),
  // Art 1 "Wage": basic plus cash allowances.
  restDayWageBase: param("wage", c, "DL33_ART1"),
  dailyDivisor: param(30, c, CONV),
  prorationBasis: param("calendar-days", c, CONV),
};

const LEAVE: Record<string, RuleParam> = {
  // 31(3)(a): "The first fifteen (15) days with full pay."
  sickFullPayDays: param(15, o, "DL33_ART31"),
  // 31(3)(b): "The following thirty (30) days with half pay."
  sickHalfPayDays: param(30, o, "DL33_ART31"),
  // 31(3): "no more than (90) ninety ... days per year".
  sickMaxDays: param(90, o, "DL33_ART31"),
  // 31(2): no paid sick leave during probation.
  sickPaidInProbation: param(false, o, "DL33_ART31"),
  // "Full pay" read as the Art 1 wage.
  paidLeaveBase: param("wage", c, "DL33_ART1"),
  // 30(1)(a): "The first forty-five (45) days with full pay."
  maternityFullPayDays: param(45, o, "DL33_ART30"),
  // 30(1)(b): "The following fifteen (15) days with half pay."
  maternityHalfPayDays: param(15, o, "DL33_ART30"),
  // 30(2): up to 45 further days unpaid.
  maternityUnpaidExtraDays: param(45, o, "DL33_ART30"),
  // ER 19(1): cash "in accordance with the wage he earns".
  encashInServiceBase: param("wage", o, "ER1_2022_ART19"),
};

const DEDUCTIONS: Record<string, RuleParam> = {
  // 25(2): "not ... exceed fifty percent (50%) of the wage".
  deductionOverallCapBps: param(5000, o, "DL33_ART25"),
  // 25(1)(b): "shall not exceed twenty percent (20%) of the wage".
  overpaymentCapBps: param(2000, o, "DL33_ART25"),
  // 25(1)(f): "shall not exceed five percent (5%) of the wage".
  violationCapBps: param(500, o, "DL33_ART25"),
  // 39(1)(c): "not exceeding the wages of five (5) days per month".
  violationCapDays: param(5, o, "DL33_ART39"),
  // 25(1)(f) against 39(1)(c): the stricter of the two is used.
  violationCapRule: param("stricter", c, "DL33_ART25"),
  // 25(1)(h): "shall not exceed the wage of (5) five days per month".
  damageCapDays: param(5, o, "DL33_ART25"),
  // 25(1)(g): "not exceed a quarter of the wage".
  courtDebtCapBps: param(2500, o, "DL33_ART25"),
  // 25(1)(a): loans "after the worker's written consent".
  loanConsentRequired: param(true, o, "DL33_ART25"),
  // 25(1)(e) needs written agreement; we also require it for (d).
  schemeConsentRequired: param(true, c, "DL33_ART25"),
  deductionCapBase: param("earned-wage", c, CONV),
  deductionOrder: param(
    "gpssa,court-debt,overpayment,violation,damage,scheme,loan", c, CONV),
  capRoundingMode: param("DOWN", c, CONV),
  roundingMode: param("HALF_UP", c, CONV),
};

/** Monthly pay under Decree-Law 33/2021, in force from 2 February 2022. */
const AE_PAYROLL_2022: RulePack = {
  id: "ae-payroll",
  version: "2022-02-02",
  effectiveFrom: "2022-02-02",
  effectiveTo: null,
  params: { ...OVERTIME, ...LEAVE, ...DEDUCTIONS },
};

export const PAYROLL_PACKS: readonly RulePack[] =
  deepFreeze([AE_PAYROLL_2022]);
