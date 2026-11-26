import { handlerMap, type SubjectHandler } from "./approvals/subjects";
import type { AppDeps } from "./deps";
import { claimReceiptViewer } from "./expenses/receipt-access";
import { expenseClaimSubject } from "./expenses/subject";
import type { App } from "./http/context";
import { registerApprovalRoutes } from "./routes/approvals";
import { registerExpenseClaimRoutes } from "./routes/expense-claims";
import { registerExpensePolicyRoutes } from "./routes/expense-policy";
import { registerExpenseReportRoutes } from "./routes/expense-reports";
import { registerReceiptRoutes } from "./routes/receipts";

export interface ExpenseAppOpts {
  /** Approval subject handlers; the default is the app's own list. */
  subjects?: readonly SubjectHandler[];
}

/** The subjects served by the approval spine in production. */
export const DEFAULT_SUBJECTS: readonly SubjectHandler[] = [
  expenseClaimSubject,
];

/** Plan 6 routes: approvals, receipts, policy, claims and reports. */
export function registerExpenseApp(app: App, deps: AppDeps,
  opts: ExpenseAppOpts): void {
  const handlers = handlerMap(opts.subjects ?? DEFAULT_SUBJECTS);
  registerApprovalRoutes(app, deps, handlers);
  registerReceiptRoutes(app, deps, claimReceiptViewer);
  registerExpensePolicyRoutes(app, deps);
  registerExpenseClaimRoutes(app, deps, handlers);
  registerExpenseReportRoutes(app, deps);
}
