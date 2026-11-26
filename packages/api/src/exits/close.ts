import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { openFlowTaskIds } from "../tasks/tasks";
import { dubaiDate } from "../time/dubai";
import { loadEmployee } from "../people/employees";
import { storedAccess } from "./exit-hooks-view";
import { leaverLogins, stillActive } from "./leaver-logins";
import { assertNotSubject } from "./subject";
import type { ExitRow } from "./exit-rows";
import { exitView, visibleExit } from "./exits";

type IdCtx = ReqCtx<unknown, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

/** Every close condition, in order; throws the first that fails. */
async function assertClosable(ctx: IdCtx, x: ExitRow): Promise<void> {
  if (x.status !== "in-notice") throw new ApiError("EXIT_NOT_APPROVED");
  if (dubaiDate(ctx.deps.now()) < x.lastWorkingDate) {
    throw new ApiError("EXIT_BEFORE_LAST_DAY");
  }
  const open = await openFlowTaskIds(ctx.tx, co(ctx),
    { type: "exit", id: x.id });
  if (open.length > 0) {
    throw new ApiError("CLEARANCE_OPEN", undefined, { taskIds: open });
  }
  await assertSettlementCurrent(ctx, x);
  await assertAccessClosed(ctx, x);
}

/** Computed or refused, and made on the current salary (review M-2). */
async function assertSettlementCurrent(ctx: IdCtx, x: ExitRow) {
  if (x.settlement === null) throw new ApiError("SETTLEMENT_REQUIRED");
  const e = await loadEmployee(ctx.tx, ctx.deps, co(ctx), x.employeeId);
  if (e.salaryVersion !== x.settlement.inputs.salaryVersion) {
    throw new ApiError("SETTLEMENT_STALE");
  }
}

/**
 * A revocation run is stored (also for "no-login"), and no login that
 * may be the leaver's is active now, re-read live (review I-1).
 */
async function assertAccessClosed(ctx: IdCtx, x: ExitRow) {
  if (await storedAccess(ctx.tx, co(ctx), x) === null) {
    throw new ApiError("ACCESS_NOT_REVOKED");
  }
  const live = stillActive(await leaverLogins(ctx.tx, co(ctx), x));
  if (live.length > 0) {
    throw new ApiError("ACCESS_NOT_REVOKED", undefined,
      { userIds: live.map((l) => l.userId) });
  }
}

/**
 * Closes an exit on or after the last working day (Dubai) once the
 * clearance tasks are done, a settlement is stored and access is
 * revoked (or the leaver had no login).
 */
export async function closeExit(ctx: IdCtx) {
  const x = await visibleExit(ctx, true);
  await assertNotSubject(ctx, x);
  await assertClosable(ctx, x);
  await ctx.tx.query(
    `UPDATE exits SET status = 'closed', closed_at = $3
     WHERE company_id = $1 AND id = $2`,
    [co(ctx), x.id, ctx.deps.now().toISOString()]);
  await auditFor(ctx, "exit", "exit.closed", x.id);
  return exitView(ctx, x.id);
}
