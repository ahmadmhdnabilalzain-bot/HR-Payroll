import { deepFreeze } from "../freeze";
import { CONV, SEC, sourced, unsourced } from "./tax-param";
import type { RulePack } from "./types";

const GUIDE = "FTA_VAT_GUIDE21";
const EC = "ENGINE_CONVENTION";

/**
 * ae-vat. Every guide value is `secondary`: the 2021 guide may be
 * outdated. The standard rate is read only from the guide's worked
 * example ("AED 100 under Amount and AED 5 under VAT Amount");
 * Decree-Law 8 of 2017 is unread. The start 2018-01-01 is a
 * convention (Ruling 2). The 2021 late fines may have changed under
 * Cabinet Decision 129 of 2025 (in force 14 Apr 2026): unsourced.
 */
const AE_VAT: RulePack = {
  id: "ae-vat",
  version: "2026-11-26",
  effectiveFrom: "2018-01-01",
  effectiveTo: null,
  params: {
    standardRateBps: sourced(500, SEC, GUIDE),
    vatRounding: sourced("HALF_UP", CONV, EC),
    vatMismatchToleranceFils: sourced(1, CONV, EC),
    // Guide 2.1: "no later than the 28th day following the end".
    returnDueDaysAfterPeriodEnd: sourced(28, SEC, GUIDE),
    // Guide 2.1: "extended to the first business day thereafter".
    returnDueRollsToNextBusinessDay: sourced(true, SEC, GUIDE),
    weekendDays: sourced("SAT,SUN", CONV, EC),
    // Guide 2.1: "you are required to submit a 'nil' VAT Return".
    nilReturnRequired: sourced(true, SEC, GUIDE),
    // Guide notes under Boxes 1 and 9: AED 10,000 or less.
    errorCorrectionThresholdFils: sourced(1000000, SEC, GUIDE),
    box201Layout: sourced("guide-2021-v4.0", SEC, GUIDE),
    lateFilingFineFils: unsourced(),
    lateFilingRepeatFineFils: unsourced(),
    latePaymentFirstBps: unsourced(),
    latePaymentMonthlyBps: unsourced(),
    latePaymentCapBps: unsourced(),
  },
};

export const VAT_PACKS: readonly RulePack[] = deepFreeze([AE_VAT]);
