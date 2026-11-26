import type { PayRunCreate } from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import {
  approvePayRun,
  createPayRun,
  loadRun,
  RUN_SELECT,
  toPayRun,
  voidPayRun,
  type RunRow,
} from "../payroll/pay-runs";
import { myPayslips, payslipFor, payslipsOfRun } from "../payroll/payslips";

type IdCtx = ReqCtx<unknown, unknown, { id: string }>;
const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

export function registerPayRunRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "createPayRun", (ctx: ReqCtx<PayRunCreate, unknown,
    unknown, { "idempotency-key": string }>) =>
    createPayRun(ctx, ctx.headers["idempotency-key"]));
  register(app, deps, "listPayRuns", async (ctx) => ({
    items: (await ctx.tx.query<RunRow>(`${RUN_SELECT}
      WHERE r.company_id = $1
      ORDER BY r.year DESC, r.month DESC, r.created_at DESC, r.id`,
    [co(ctx)])).map(toPayRun) }));
  register(app, deps, "getPayRun", async (ctx: IdCtx) =>
    toPayRun(await loadRun(ctx.tx, co(ctx), ctx.params.id)));
  register(app, deps, "listPayRunPayslips", async (ctx: IdCtx) => {
    const r = await loadRun(ctx.tx, co(ctx), ctx.params.id);
    return { items: await payslipsOfRun(ctx.tx, ctx.deps, co(ctx), r.id) };
  });
  register(app, deps, "voidPayRun", voidPayRun);
  register(app, deps, "approvePayRun", approvePayRun);
  register(app, deps, "listMyPayslips", async (ctx) => ({
    items: await myPayslips(ctx.tx, ctx.deps, ctx.tenant!) }));
  register(app, deps, "getPayslip", (ctx: IdCtx) =>
    payslipFor(ctx.tx, ctx.deps, ctx.tenant!, ctx.params.id));
}
