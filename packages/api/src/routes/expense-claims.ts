import type { SubjectHandlers } from "../approvals/subjects";
import type { AppDeps } from "../deps";
import {
  cancelClaim,
  createClaim,
  getClaim,
  listClaims,
  updateClaim,
} from "../expenses/claims";
import { submitClaim } from "../expenses/submit";
import { register, type App, type ReqCtx } from "../http/context";

type IdCtx = ReqCtx<unknown, unknown, { id: string }>;

export function registerExpenseClaimRoutes(app: App, deps: AppDeps,
  handlers: SubjectHandlers): void {
  register(app, deps, "listExpenseClaims", async (ctx) =>
    ({ items: await listClaims(ctx) }));
  register(app, deps, "createExpenseClaim", createClaim);
  register(app, deps, "getExpenseClaim", (ctx: IdCtx) =>
    getClaim(ctx, ctx.params.id));
  register(app, deps, "updateExpenseClaim", updateClaim);
  register(app, deps, "submitExpenseClaim", (ctx: IdCtx) =>
    submitClaim(ctx, handlers, ctx.params.id));
  register(app, deps, "cancelExpenseClaim", cancelClaim);
}
