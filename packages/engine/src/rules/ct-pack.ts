import { deepFreeze } from "../freeze";
import { CONV, SEC, sourced, unsourced } from "./tax-param";
import type { RulePack } from "./types";

const BULLETIN = "FTA_CT_SB_BULLETIN";

/**
 * ae-ct, selected on the tax period's end date (Ruling 17). All read
 * values are extracts or snippets of FTA pages: `secondary`. The
 * Decree-Law (47 of 2022) was not read.
 */
const AE_CT: RulePack = {
  id: "ae-ct",
  version: "2026-11-26",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  params: {
    // Bulletin snippet: taxable income "not exceeding AED 375,000".
    zeroBandUpperFils: sourced(37500000, SEC, BULLETIN),
    // The bulletin snippet cut off the 0% word; the 25 Nov note
    // shows "0% on taxable income up to AED 375,000".
    zeroBandRateBps: sourced(0, SEC, "RESEARCH_CT_ZERO_RATE"),
    // Bulletin snippet: "9% on the portion of the Taxable Income".
    mainRateBps: sourced(900, SEC, BULLETIN),
    taxRounding: sourced("HALF_UP", CONV, "ENGINE_CONVENTION"),
    // Topics page: "equal to or less than AED 3,000,000".
    sbrRevenueThresholdFils:
      sourced(300000000, SEC, "FTA_CT_SBR_TOPIC"),
    sbrLastPeriodEnd: unsourced(),
    // News 24 Sep 2025: "not exceeding nine months from the end".
    returnDueMonthsAfterPeriodEnd:
      sourced(9, SEC, "FTA_CT_FILING_NEWS"),
    lateFilingFineFils: unsourced(),
  },
};

export const CT_PACKS: readonly RulePack[] = deepFreeze([AE_CT]);
