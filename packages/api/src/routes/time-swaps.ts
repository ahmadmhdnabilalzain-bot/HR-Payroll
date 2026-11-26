import type { SwapCreate } from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";
import { audit, co, nowIso, selfEmployee } from "../time/ctx";
import { assertTimeDecidable } from "../time/decide";
import {
  applySwap,
  canSeeSwap,
  checkNewSwap,
  loadSwap,
  toSwap,
  visibleSwap,
  type SwapRow,
} from "../time/swaps";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

async function setStatus(ctx: ReqCtx, r: SwapRow, status: string,
  decided: boolean) {
  await ctx.tx.query(
    `UPDATE swap_requests SET status = $3,
       decided_by = CASE WHEN $4 THEN $5::uuid ELSE decided_by END,
       decided_at = CASE WHEN $4 THEN $6::timestamptz ELSE decided_at END
     WHERE company_id = $1 AND id = $2`,
    [co(ctx), r.id, status, decided, ctx.user!.id, nowIso(ctx)]);
  await audit(ctx, `swap.${status === "pending-approval" ? "accepted"
    : status}`, "swap", r.id);
  return toSwap(ctx.tx, co(ctx), await loadSwap(ctx.tx, co(ctx), r.id));
}

async function create(ctx: ReqCtx<SwapCreate>) {
  const me = selfEmployee(ctx);
  const v = await checkNewSwap(ctx.tx, ctx.tenant!, me, ctx.body,
    dubaiDate(ctx.deps.now()));
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO swap_requests (id, company_id, requester_employee_id,
       date, peer_employee_id, peer_date, status, requester_version,
       peer_version, requested_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending-peer', $7, $8, $9, $10)`,
    [id, co(ctx), me, ctx.body.date, ctx.body.withEmployeeId, v.peerDate,
      v.mine, v.theirs, ctx.user!.id, nowIso(ctx)]);
  await audit(ctx, "swap.requested", "swap", id);
  return toSwap(ctx.tx, co(ctx), await loadSwap(ctx.tx, co(ctx), id));
}

/** Only the peer answers, while the request waits for them. */
async function respond(ctx: IdCtx<{ accept: boolean }>) {
  const r = await visibleSwap(ctx.tx, ctx.tenant!, ctx.params.id, true);
  if (ctx.tenant!.employeeId !== r.peer_employee_id) {
    throw new ApiError("NOT_SWAP_PARTY");
  }
  if (r.status !== "pending-peer") throw new ApiError("SWAP_NOT_PENDING");
  return setStatus(ctx, r, ctx.body.accept ? "pending-approval"
    : "declined", false);
}

function decider(to: "approved" | "rejected") {
  return async (ctx: IdCtx) => {
    const r = await loadSwap(ctx.tx, co(ctx), ctx.params.id, true);
    if (!(await canSeeSwap(ctx.tx, ctx.tenant!, r))) {
      throw new ApiError("NOT_FOUND");
    }
    await assertTimeDecidable(ctx, { employeeIds: [r.requester_employee_id,
      r.peer_employee_id], requestedByUserId: r.requested_by,
    status: r.status }, "pending-approval", "SWAP_NOT_PENDING");
    if (to === "approved") await applySwap(ctx.tx, co(ctx), r);
    return setStatus(ctx, r, to, true);
  };
}

/** The requester, while the request is pending. */
async function cancel(ctx: IdCtx) {
  const r = await visibleSwap(ctx.tx, ctx.tenant!, ctx.params.id, true);
  if (ctx.tenant!.employeeId !== r.requester_employee_id) {
    throw new ApiError("NOT_SWAP_PARTY");
  }
  if (!["pending-peer", "pending-approval"].includes(r.status)) {
    throw new ApiError("SWAP_NOT_PENDING");
  }
  return setStatus(ctx, r, "cancelled", false);
}

async function list(ctx: ReqCtx) {
  const rows = await ctx.tx.query<SwapRow>("SELECT * FROM swap_requests " +
    "WHERE company_id = $1 ORDER BY created_at DESC, id", [co(ctx)]);
  const items = [];
  for (const r of rows) {
    if (await canSeeSwap(ctx.tx, ctx.tenant!, r)) {
      items.push(await toSwap(ctx.tx, co(ctx), r));
    }
  }
  return { items };
}

export function registerTimeSwapRoutes(app: App, deps: AppDeps) {
  register(app, deps, "listSwapRequests", list);
  register(app, deps, "createSwapRequest", create);
  register(app, deps, "respondSwapRequest", respond);
  register(app, deps, "approveSwapRequest", decider("approved"));
  register(app, deps, "rejectSwapRequest", decider("rejected"));
  register(app, deps, "cancelSwapRequest", cancel);
}
