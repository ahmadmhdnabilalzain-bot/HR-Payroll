import type { z } from "zod";
import * as approvals from "./approvals";
import * as policy from "./expense-policy";
import * as reports from "./expense-reports";
import * as expenses from "./expenses";
import * as payroll from "./payroll";
import * as receipts from "./receipts";

/** Plan 6's named schemas (OpenAPI components and EXAMPLES keys). */
const NAMES: [Record<string, unknown>, string[]][] = [
  [approvals, ["ApproverSpec", "ApprovalTier", "ApprovalChain",
    "ApprovalChainList", "ApprovalChainUpdate", "ApprovalStep",
    "ApprovalView", "ApprovalTask", "ApprovalTaskList", "ApprovalDecision",
    "ApprovalDecisionWithNote"]],
  [receipts, ["ReceiptUpload", "ReceiptSuggestion", "Receipt",
    "ReceiptContent"]],
  [policy, ["ExpenseCategory", "ExpenseCategoryList",
    "ExpenseCategoryCreate", "ExpenseCategoryUpdate", "ExpenseLimit",
    "MileageRate", "PerDiemRate", "ExpensePolicy", "ExpensePolicyUpdate"]],
  [expenses, ["ExpenseItemInput", "ExpenseItem", "ClaimFlag",
    "ExpenseClaim", "ExpenseClaimList", "ExpenseClaimCreate",
    "ExpenseClaimUpdate", "ClaimCancel"]],
  [reports, ["SummaryRow", "SummaryReport", "VatRegisterRow",
    "VatRegister", "AgingRow", "AgingReport", "UnpaidRow", "UnpaidReport",
    "PayoutRow", "Payouts"]],
  [payroll, ["ReimbursementLine"]],
];

export const EXPENSE_SCHEMAS: Readonly<Record<string, z.ZodType>> =
  Object.fromEntries(NAMES.flatMap(([mod, names]) => names.map((n) => {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    return [n, s as z.ZodType];
  })));
