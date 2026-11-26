/**
 * Plan 6 route ids not yet served while the plan is built task by
 * task. The conformance and leak suites skip these; each task removes
 * the ids it serves, and Task 7 asserts the list is empty.
 */
export const PLAN6_PENDING: ReadonlySet<string> = new Set([
  "approvalInbox", "approveStep", "rejectStep", "returnStep",
  "listApprovalChains", "putApprovalChain",
  "uploadReceipt", "getReceipt", "downloadReceipt",
  "listExpenseCategories", "createExpenseCategory",
  "updateExpenseCategory", "getExpensePolicy", "putExpensePolicy",
  "listExpenseClaims", "createExpenseClaim", "getExpenseClaim",
  "updateExpenseClaim", "submitExpenseClaim", "cancelExpenseClaim",
  "expenseSummary", "expenseVatRegister", "expenseAging",
  "expenseUnpaid", "expensePayouts",
]);
