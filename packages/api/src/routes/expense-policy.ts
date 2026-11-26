import type { AppDeps } from "../deps";
import {
  createCategory,
  listCategories,
  updateCategory,
} from "../expenses/categories";
import { getPolicy, putPolicy } from "../expenses/policy-store";
import { register, type App } from "../http/context";

export function registerExpensePolicyRoutes(app: App, deps: AppDeps)
  : void {
  register(app, deps, "listExpenseCategories", async (ctx) =>
    ({ items: await listCategories(ctx.tx, ctx.tenant!.companyId) }));
  register(app, deps, "createExpenseCategory", createCategory);
  register(app, deps, "updateExpenseCategory", updateCategory);
  register(app, deps, "getExpensePolicy", (ctx) =>
    getPolicy(ctx.tx, ctx.tenant!.companyId));
  register(app, deps, "putExpensePolicy", putPolicy);
}
