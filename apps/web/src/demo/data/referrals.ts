import {
  buildDemoCompany,
  DRAFT_LABEL,
  NEXT_RUN_TEXT,
  referralLedger,
  referralSummary,
  REFERRAL_TERMS,
  type ReferralRow,
  type ReferralStage,
  type ReferralSummary,
} from "@payroll/demo-data";

export type { ReferralRow, ReferralStage, ReferralSummary };
export { DRAFT_LABEL, NEXT_RUN_TEXT, REFERRAL_TERMS };

/** The referral and agency ledger's data (P22), a lazy chunk. */
export interface ReferralSource {
  rows: ReferralRow[];
  summary(marked: ReadonlySet<string>): ReferralSummary;
}

export function buildReferralSource(): ReferralSource {
  const rows = referralLedger(buildDemoCompany());
  return { rows, summary: (marked) => referralSummary(rows, marked) };
}
