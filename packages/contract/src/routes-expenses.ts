import {
  ApprovalChain,
  ApprovalChainList,
  ApprovalChainUpdate,
  ApprovalDecision,
  ApprovalDecisionWithNote,
  ApprovalTaskList,
  ApprovalView,
  SubjectTypeParams,
} from "./approvals";
import {
  ExpenseCategory,
  ExpenseCategoryCreate,
  ExpenseCategoryList,
  ExpenseCategoryUpdate,
  ExpensePolicy,
  ExpensePolicyUpdate,
} from "./expense-policy";
import {
  AgingReport,
  Payouts,
  PayoutsQuery,
  SummaryQuery,
  SummaryReport,
  UnpaidReport,
  VatRegister,
  VatRegisterQuery,
} from "./expense-reports";
import {
  ClaimCancel,
  ExpenseClaim,
  ExpenseClaimCreate,
  ExpenseClaimList,
  ExpenseClaimQuery,
  ExpenseClaimUpdate,
} from "./expenses";
import { IdParams } from "./primitives";
import { Receipt, ReceiptContent, ReceiptUpload } from "./receipts";
import {
  ALL_ROLES,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";

const one = { params: IdParams };

const APPROVALS: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "approvalInbox", method: "GET",
    path: "/v1/approvals/inbox", response: ApprovalTaskList }),
  ten(ALL_ROLES, { id: "approveStep", method: "POST",
    path: "/v1/approvals/{id}/approve", ...one, body: ApprovalDecision,
    response: ApprovalView }),
  ten(ALL_ROLES, { id: "rejectStep", method: "POST",
    path: "/v1/approvals/{id}/reject", ...one,
    body: ApprovalDecisionWithNote, response: ApprovalView }),
  ten(ALL_ROLES, { id: "returnStep", method: "POST",
    path: "/v1/approvals/{id}/return", ...one,
    body: ApprovalDecisionWithNote, response: ApprovalView }),
  ten(PAYROLL, { id: "listApprovalChains", method: "GET",
    path: "/v1/approval-chains", response: ApprovalChainList }),
  ten(OWNER, { id: "putApprovalChain", method: "PUT",
    path: "/v1/approval-chains/{subjectType}", params: SubjectTypeParams,
    body: ApprovalChainUpdate, response: ApprovalChain, mfa: true }),
];

const RECEIPTS: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "uploadReceipt", method: "POST",
    path: "/v1/receipts", body: ReceiptUpload, response: Receipt,
    status: 201, bodyLimit: 7_500_000 }),
  ten(ALL_ROLES, { id: "getReceipt", method: "GET",
    path: "/v1/receipts/{id}", ...one, response: Receipt }),
  ten(ALL_ROLES, { id: "downloadReceipt", method: "GET",
    path: "/v1/receipts/{id}/content", ...one, response: ReceiptContent,
    contentType: "binary" }),
];

const POLICY: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listExpenseCategories", method: "GET",
    path: "/v1/expense-categories", response: ExpenseCategoryList }),
  ten(PAYROLL, { id: "createExpenseCategory", method: "POST",
    path: "/v1/expense-categories", body: ExpenseCategoryCreate,
    response: ExpenseCategory, status: 201 }),
  ten(PAYROLL, { id: "updateExpenseCategory", method: "PATCH",
    path: "/v1/expense-categories/{id}", ...one,
    body: ExpenseCategoryUpdate, response: ExpenseCategory }),
  ten(ALL_ROLES, { id: "getExpensePolicy", method: "GET",
    path: "/v1/expense-policy", response: ExpensePolicy }),
  ten(PAYROLL, { id: "putExpensePolicy", method: "PUT",
    path: "/v1/expense-policy", body: ExpensePolicyUpdate,
    response: ExpensePolicy }),
];

const CLAIMS: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listExpenseClaims", method: "GET",
    path: "/v1/expense-claims", query: ExpenseClaimQuery,
    response: ExpenseClaimList }),
  ten(ALL_ROLES, { id: "createExpenseClaim", method: "POST",
    path: "/v1/expense-claims", body: ExpenseClaimCreate,
    response: ExpenseClaim, status: 201 }),
  ten(ALL_ROLES, { id: "getExpenseClaim", method: "GET",
    path: "/v1/expense-claims/{id}", ...one, response: ExpenseClaim }),
  ten(ALL_ROLES, { id: "updateExpenseClaim", method: "PATCH",
    path: "/v1/expense-claims/{id}", ...one, body: ExpenseClaimUpdate,
    response: ExpenseClaim }),
  ten(ALL_ROLES, { id: "submitExpenseClaim", method: "POST",
    path: "/v1/expense-claims/{id}/submit", ...one,
    response: ExpenseClaim }),
  ten(ALL_ROLES, { id: "cancelExpenseClaim", method: "POST",
    path: "/v1/expense-claims/{id}/cancel", ...one, body: ClaimCancel,
    response: ExpenseClaim }),
];

const csv = "text/csv-optional" as const;

const REPORTS: readonly RouteDef[] = [
  ten(PAYROLL, { id: "expenseSummary", method: "GET",
    path: "/v1/expense-reports/summary", query: SummaryQuery,
    response: SummaryReport, contentType: csv }),
  ten(PAYROLL, { id: "expenseVatRegister", method: "GET",
    path: "/v1/expense-reports/vat-register", query: VatRegisterQuery,
    response: VatRegister, contentType: csv }),
  ten(PAYROLL, { id: "expenseAging", method: "GET",
    path: "/v1/expense-reports/aging", response: AgingReport }),
  ten(PAYROLL, { id: "expenseUnpaid", method: "GET",
    path: "/v1/expense-reports/unpaid", response: UnpaidReport }),
  ten(PAYROLL, { id: "expensePayouts", method: "GET",
    path: "/v1/expense-reports/payouts", query: PayoutsQuery,
    response: Payouts, contentType: csv }),
];

/** Plan 6: approvals, receipts, expense policy, claims and reports. */
export const EXPENSE_ROUTES: readonly RouteDef[] = [
  ...APPROVALS,
  ...RECEIPTS,
  ...POLICY,
  ...CLAIMS,
  ...REPORTS,
];
