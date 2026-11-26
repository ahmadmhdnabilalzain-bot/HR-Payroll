import type {
  LeaveBlackoutCreate,
  LeaveBlackoutUpdate,
  LeavePolicyPut,
  LeaveRequestCreate,
} from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import {
  createBlackout,
  listBlackouts,
  updateBlackout,
} from "../leave/blackouts";
import { runCarryOver } from "../leave/carry-over";
import { loadPolicy, putPolicy } from "../leave/policy";
import { planFor } from "../leave/requests";
import { audit, changedKeys, co, nowIso } from "../time/ctx";
import { dubaiDate } from "../time/dubai";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;
const today = (ctx: ReqCtx) => dubaiDate(ctx.deps.now());

async function putPol(ctx: IdCtx<LeavePolicyPut>) {
  const p = await putPolicy(ctx.tx, co(ctx), ctx.params.id, ctx.body,
    nowIso(ctx));
  await audit(ctx, "leave.policy.updated", "leave-type", ctx.params.id,
    { leaveTypeId: ctx.params.id, changed: changedKeys(ctx.body) });
  return p;
}

async function newBlackout(ctx: ReqCtx<LeaveBlackoutCreate>) {
  const b = await createBlackout(ctx.tx, co(ctx), ctx.deps.newId(),
    ctx.body);
  await audit(ctx, "blackout.created", "leave-blackout", b.id,
    { from: b.from, to: b.to });
  return b;
}

async function editBlackout(ctx: IdCtx<LeaveBlackoutUpdate>) {
  const b = await updateBlackout(ctx.tx, co(ctx), ctx.params.id, ctx.body);
  await audit(ctx, "blackout.updated", "leave-blackout", b.id,
    { changed: changedKeys(ctx.body) });
  return b;
}

/** Every rule of a request, nothing written. */
async function preview(ctx: ReqCtx<LeaveRequestCreate>) {
  const { plan } = await planFor(ctx.tx, ctx.tenant!, ctx.body, today(ctx));
  return { days: plan.count.halves / 2,
    dates: plan.count.dates.map((d) => ({ date: d.date, part: d.part })),
    skipped: plan.count.skipped, balanceAfter: plan.balanceAfter,
    warnings: plan.warnings, blocked: plan.blocked };
}

async function carry(ctx: ReqCtx<{ fromYear: number }>) {
  const r = await runCarryOver(ctx.tx, co(ctx), ctx.body.fromYear,
    nowIso(ctx));
  if (!r.alreadyRun) {
    await audit(ctx, "leave.carried", "leave-carry-over", null,
      { fromYear: r.fromYear, rowCount: r.rows.length });
  }
  return r;
}

export function registerTimeLeaveRoutes(app: App, deps: AppDeps) {
  register(app, deps, "getLeavePolicy", (ctx: IdCtx) =>
    loadPolicy(ctx.tx, co(ctx), ctx.params.id, today(ctx)));
  register(app, deps, "putLeavePolicy", putPol);
  register(app, deps, "listLeaveBlackouts", async (ctx: ReqCtx<unknown,
    { year: number }>) => ({ items: await listBlackouts(ctx.tx, co(ctx),
    ctx.query.year) }));
  register(app, deps, "createLeaveBlackout", newBlackout);
  register(app, deps, "updateLeaveBlackout", editBlackout);
  register(app, deps, "previewLeaveRequest", preview);
  register(app, deps, "runLeaveCarryOver", carry);
}
