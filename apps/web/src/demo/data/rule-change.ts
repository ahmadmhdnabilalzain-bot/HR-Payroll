import {
  buildDemoCompany,
  ruleChangePreview,
  type RuleChangePreview,
  type RuleChangeRow,
} from "@payroll/demo-data";

export type { RuleChangePreview, RuleChangeRow };

/**
 * S09 rule-change preview (WP28): the package's selector, read once in
 * a lazy chunk (it re-runs every October payslip through the engine).
 * It reads the base company: an IBAN entered in the demo moves who is
 * in the salary file, never what a payslip works out to.
 */
export interface RuleChangeSource {
  preview: RuleChangePreview;
}

export function buildRuleChangeSource(): RuleChangeSource {
  return { preview: ruleChangePreview(buildDemoCompany()) };
}
