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
const UNSOURCED: RuleParam = { value: null, status: "unsourced",
  source: null };

/** Decree-Law 57/2023 (insured from 31 October 2023). */
const DL57: Record<string, RuleParam> = {
  // 4(1)(a): "(11%) of the subscription account salary".
  gpssaDl57EmployeeBps: param(1100, o, "DL57_ART4"),
  // 4(1)(b): "(15%) of the subscription account salary".
  gpssaDl57EmployerBps: param(1500, o, "DL57_ART4"),
  // 4(1)(b): "the Government shall bear (2.5%) of its share".
  gpssaDl57GovSupportBps: param(250, o, "DL57_ART4"),
  // 4(1)(b): "salaries are less than twenty thousand (20,000) AED".
  gpssaDl57GovSupportBelowFils: param(2000000, o, "DL57_ART4"),
  // 5(2): "not less than three thousand (3,000) AED".
  gpssaDl57MinSalaryFils: param(300000, o, "DL57_ART5"),
  // 5(2): "does not exceed seventy thousand (70,000)".
  gpssaDl57MaxSalaryFils: param(7000000, o, "DL57_ART5"),
  // 11(3): "part of a month is considered a full month".
  gpssaDl57LastMonth: param("full-month", o, "DL57_ART11"),
};

/** Law 7/1999 as shown on the official site (amendments not read). */
const L7: Record<string, RuleParam> = {
  // 2(1): "deducted at the rate of (5%)".
  gpssaL7EmployeeBps: param(500, o, "L7_ART2"),
  // 2(2): "at the rate of (15%) of the contribution account salary".
  gpssaL7EmployerBps: param(1500, o, "L7_ART2"),
  // 2(2): "the government shall bear a rate (2.5%)"; no threshold.
  gpssaL7GovSupportBps: param(250, o, "L7_ART2"),
  // 1(d): "less than Dhs 1000 ... this last limit shall be taken".
  gpssaL7MinSalaryFils: param(100000, o, "L7_ART1"),
  // 1(d): "exceeds fifty thousand Dirham ... this limit".
  gpssaL7MaxSalaryFils: param(5000000, o, "L7_ART1"),
  // Art 10: "not payable for the part of the month on which the
  // service ends".
  gpssaL7LastMonth: param("none-if-partial", o, "L7_ART10"),
};

const SHARED: Record<string, RuleParam> = {
  // DL57 10(2): "on the basis of the Insured's salary in the month of
  // January ... the month in which he joined".
  gpssaFixingRule: param("january-or-joining-month", o, "DL57_ART10"),
  // DL57 5(2) says only "the wage determined by the employment
  // contract": basic or basic plus allowances is not settled.
  gpssaContributionSalaryBase: UNSOURCED,
  // No text read gives a rule for GCC nationals working in the UAE.
  gpssaGccNationalContribution: UNSOURCED,
  gpssaRoundingMode: param("HALF_UP", "convention", "ENGINE_CONVENTION"),
};

/** GPSSA contributions, selectable from Decree-Law 57/2023's start. */
const AE_GPSSA_2023: RulePack = {
  id: "ae-gpssa",
  version: "2023-10-31",
  effectiveFrom: "2023-10-31",
  effectiveTo: null,
  params: { ...DL57, ...L7, ...SHARED },
};

export const GPSSA_PACKS: readonly RulePack[] =
  deepFreeze([AE_GPSSA_2023]);
