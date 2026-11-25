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

const LAW = "LAW_33_2021";
const EOSB_PRESS = "ARABIAN_BUSINESS_EOSB";
const CONVENTION = "ENGINE_CONVENTION";

/** UAE end-of-service gratuity, Federal Decree-Law 33 of 2021. */
const AE_GRATUITY_2022: RulePack = {
  id: "ae-gratuity",
  version: "2022-02-02",
  effectiveFrom: "2022-02-02",
  effectiveTo: null,
  params: {
    minServiceYears: param(1, "official", LAW),
    tier1DaysPerYear: param(21, "official", LAW),
    tier1Years: param(5, "official", LAW),
    tier2DaysPerYear: param(30, "official", LAW),
    capYearsOfWage: param(2, "official", LAW),
    // The law says "two years' wage"; whether that is basic or total wage
    // is not settled in the fetched text.
    capBase: param("basic", "secondary", "X0PA_EOSB_CALC"),
    unpaidDaysExcluded: param(true, "official", "UAE_GOV_EOSB"),
    // Article 51: the last basic wage.
    basicWageOnly: param(true, "official", LAW),
    leavePayBase: param("basic", "official", "UAE_GOV_LEAVES"),
    dailyWageDivisor: param(30, "secondary", EOSB_PRESS),
    // Leave pay daily rate: the leaves page gives the basic-salary base
    // but no divisor, so 30 is our choice, not the gratuity source's.
    leavePayDivisor: param(30, "convention", CONVENTION),
    partYearProRata: param(true, "secondary", EOSB_PRESS),
    monthsPerYear: param(12, "convention", CONVENTION),
    // Denominator for the leftover days of a part year.
    yearDayCount: param(365, "convention", CONVENTION),
    endDateInclusive: param(true, "convention", CONVENTION),
    // 29 February joiners: anniversary on 28 February in non-leap years.
    leapDayAnniversary: param("clamp-to-last-day-of-month", "convention",
      CONVENTION),
    roundingMode: param("HALF_UP", "convention", CONVENTION),
    // No fetched source covers GCC nationals; no default.
    gccNationalGratuity: { value: null, status: "unsourced", source: null },
  },
};

/** Frozen, with every param and source: preview works on copies. */
export const GRATUITY_PACKS: readonly RulePack[] =
  deepFreeze([AE_GRATUITY_2022]);
