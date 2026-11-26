import { handlerMap, type SubjectHandler } from "./approvals/subjects";
import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import { registerApprovalRoutes } from "./routes/approvals";
import { registerExpensePolicyRoutes } from "./routes/expense-policy";
import { registerReceiptRoutes } from "./routes/receipts";

export interface ExpenseAppOpts {
  /** Approval subject handlers; the default is the app's own list. */
  subjects?: readonly SubjectHandler[];
}

/** The subjects served by the approval spine in production. */
export const DEFAULT_SUBJECTS: readonly SubjectHandler[] = [];

/** Plan 6 routes: approvals (receipts, expenses and reports follow). */
export function registerExpenseApp(app: App, deps: AppDeps,
  opts: ExpenseAppOpts): void {
  const handlers = handlerMap(opts.subjects ?? DEFAULT_SUBJECTS);
  registerApprovalRoutes(app, deps, handlers);
  registerReceiptRoutes(app, deps);
  registerExpensePolicyRoutes(app, deps);
}
