import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { openFlowTaskIds } from "../tasks/tasks";
import { dubaiDate } from "../time/dubai";
import { exitAccess } from "./exit-hooks-view";
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
  // Computed or refused: either way HR has seen the engine's answer.
  if (x.settlement === null) throw new ApiError("SETTLEMENT_REQUIRED");
  const access = await exitAccess(ctx.tx, co(ctx), x);
  if (access.status === "not-revoked") {
    throw new ApiError("ACCESS_NOT_REVOKED");
  }
}

/**
 * Closes an exit on or after the last working day (Dubai) once the
 * clearance tasks are done, a settlement is stored and access is
 * revoked (or the leaver had no login).
 */
export async function closeExit(ctx: IdCtx) {
  const x = await visibleExit(ctx, true);
  await assertClosable(ctx, x);
  await ctx.tx.query(
    `UPDATE exits SET status = 'closed', closed_at = $3
     WHERE company_id = $1 AND id = $2`,
    [co(ctx), x.id, ctx.deps.now().toISOString()]);
  await auditFor(ctx, "exit", "exit.closed", x.id);
  return exitView(ctx, x.id);
}
