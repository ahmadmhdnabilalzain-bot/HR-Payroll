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

/** Probation (Article 9), read in the labour-law research note. */
const PROBATION: Record<string, RuleParam> = {
  // 9(1): "not exceeding six (6) months".
  empProbationMaxMonths: param(6, o, "DL33_ART9"),
  // 9(1): "notifying the Worker in writing at least fourteen (14) days".
  empProbationEmployerNoticeDays: param(14, o, "DL33_ART9"),
  // 9(4)/(6): foreign worker leaving the State: 14 days' notice.
  empProbationLeaveStateNoticeDays: param(14, o, "DL33_ART9"),
  // 9(3): another employer in the State: "one month's written notice";
  // kept as months, not 30 days.
  empProbationNewEmployerNoticeMonths: param(1, o, "DL33_ART9"),
  // Joining date plus months, clamped to month end, minus one day.
  empProbationEndRule: param("clamped-months-minus-1-day", c, EC),
};

/** Notice (Articles 43 to 45). */
const NOTICE: Record<string, RuleParam> = {
  // 43(1): "not less than thirty (30) days".
  empNoticeMinDays: param(30, o, "DL33_ART43"),
  // 43(1): "and not more than ninety (90) days".
  empNoticeMaxDays: param(90, o, "DL33_ART43"),
  // 43(2): "may be waived or reduced by agreement".
  empNoticeReducibleByAgreement: param(true, o, "DL33_ART43"),
  // 43(5): one unpaid working day per week to job-hunt when the
  // employer terminates.
  empJobSearchDayRight: param(true, o, "DL33_ART43"),
  // 44: dismissal without notice; the grounds are not encoded (body not
  // read closely), so zero days is our reading, with a counsel flag.
  empSummaryDismissalNoticeDays: param(0, c, "DL33_ART44"),
  // 45: worker exits without notice (list read); zero days, our reading.
  empWorkerExitWithoutNoticeDays: param(0, c, "DL33_ART45"),
  // Notice counts from the day after written notice.
  empNoticeStartRule: param("day-after-notice", c, EC),
};

/** Final settlement (Article 53). */
const SETTLEMENT: Record<string, RuleParam> = {
  // 53: "within fourteen (14) days as of the date of the end of the
  // contract".
  empSettlementDueDays: param(14, o, "DL33_ART53"),
  // 53 says "end of the contract"; counting from the last working date
  // is our reading (the trigger is disputed in the master list).
  empSettlementTrigger: param("last-working-date", c, "DL33_ART53"),
};

/** Employment dates, Federal Decree-Law 33 of 2021. */
const AE_EMPLOYMENT_2022: RulePack = {
  id: "ae-employment",
  version: "2022-02-02",
  effectiveFrom: "2022-02-02",
  effectiveTo: null,
  params: { ...PROBATION, ...NOTICE, ...SETTLEMENT },
};

/** Frozen, with every param and source. */
export const EMPLOYMENT_PACKS: readonly RulePack[] =
  deepFreeze([AE_EMPLOYMENT_2022]);
