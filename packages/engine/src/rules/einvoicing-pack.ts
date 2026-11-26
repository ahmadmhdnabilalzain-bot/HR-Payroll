import { deepFreeze } from "../freeze";
import { CONV, OFF, SEC, sourced, unsourced } from "./tax-param";
import type { RulePack } from "./types";

const ART5 = "MD244_2025_ART5";
const CD = "CD106_2025";
const MOF = "MOF_EINV_GUIDELINES";

/**
 * ae-einvoicing. The large-band appointment date follows the FTA news
 * of 25 Oct 2026 (read), which states MD 66 of 2026's date (Ruling
 * 20). The fines are the three Cabinet Decision 106 rows read as a
 * search extract: `secondary`.
 */
const AE_EINVOICING: RulePack = {
  id: "ae-einvoicing",
  version: "2026-11-26",
  effectiveFrom: "2026-07-01",
  effectiveTo: null,
  params: {
    // Art. 5(1)(a): "equal to or exceeds AED 50,000,000".
    largeRevenueThresholdFils: sourced(5000000000, OFF, ART5),
    largeAppointBy: sourced("2026-10-30", OFF, "FTA_NEWS_2026_10_25"),
    largeGoLive: sourced("2027-01-01", OFF, ART5),
    smallAppointBy: sourced("2027-03-31", OFF, ART5),
    smallGoLive: sourced("2027-07-01", OFF, ART5),
    voluntaryFrom: sourced("2026-07-01", OFF, "MD244_2025_ART3_4"),
    // Art. 5(2): B2C not subject until a Minister's decision.
    b2cInScope: sourced(false, OFF, ART5),
    // MD 243 Art. 6(5) as amended: "fourteen (14) Business Days".
    issueWindowBusinessDays: sourced(14, SEC, "MD197_2026"),
    weekendDays: sourced("SAT,SUN", CONV, "ENGINE_CONVENTION"),
    // Glossary: "0235 followed by the 10-digit TIN".
    participantScheme: sourced("0235", SEC, MOF),
    tinDigits: sourced(10, SEC, MOF),
    // Row 1: "AED 5,000 ... for each month or part thereof".
    notImplementedFinePerMonthFils: sourced(500000, SEC, CD),
    // Rows 2 and 3: "AED 100 for each ... up to a maximum of AED
    // 5,000 per calendar month".
    missingInvoiceFineFils: sourced(10000, SEC, CD),
    missingInvoiceMonthlyCapFils: sourced(500000, SEC, CD),
    missingCreditNoteFineFils: sourced(10000, SEC, CD),
    missingCreditNoteMonthlyCapFils: sourced(500000, SEC, CD),
    // MD 243 Art. 6(6): timeline "prescribed by the Minister", unread.
    ftaReportingDeadline: unsourced(),
  },
};

export const EINVOICING_PACKS: readonly RulePack[] =
  deepFreeze([AE_EINVOICING]);
