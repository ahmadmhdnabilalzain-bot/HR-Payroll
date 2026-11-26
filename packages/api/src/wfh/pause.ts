import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { co, nowIso } from "../time/ctx";
import { currentWfhState, STATE_ERROR } from "./status";

/**
 * Pausing needs state `tracking` (409 ALREADY_PAUSED when paused, else
 * the state's error). Pauses are tracking data: never audited.
 */
export async function pause(ctx: ReqCtx, employeeId: string)
  : Promise<void> {
  await lockEmployee(ctx.tx, co(ctx), employeeId);
  const s = await currentWfhState(ctx.tx, ctx.deps.now(), co(ctx),
    employeeId);
  if (s.state === "paused") throw new ApiError("ALREADY_PAUSED");
  if (s.state !== "tracking") throw new ApiError(STATE_ERROR[s.state]!);
  await ctx.tx.query(
    `INSERT INTO wfh_pauses (id, company_id, employee_id, attendance_id,
       started_at) VALUES ($1, $2, $3, $4, $5)`,
    [ctx.deps.newId(), co(ctx), employeeId, s.record!.id, nowIso(ctx)]);
}

export async function resume(ctx: ReqCtx, employeeId: string)
  : Promise<void> {
  await lockEmployee(ctx.tx, co(ctx), employeeId);
  const s = await currentWfhState(ctx.tx, ctx.deps.now(), co(ctx),
    employeeId);
  if (s.state !== "paused") throw new ApiError("NOT_PAUSED");
  await closePauses(ctx.tx, co(ctx), s.record!.id, nowIso(ctx));
}

/**
 * One lock serialises every consent decision, upload and pause of an
 * employee, so a withdrawal never misses an upload in flight.
 */
export async function lockEmployee(tx: Db, companyId: string,
  id: string) {
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [companyId, id]);
}

/** Ends the open pause of a record (also on clock-out). */
export async function closePauses(tx: Db, companyId: string,
  attendanceId: string, at: string): Promise<void> {
  await tx.query(
    `UPDATE wfh_pauses SET ended_at = $3 WHERE company_id = $1
     AND attendance_id = $2 AND ended_at IS NULL`,
    [companyId, attendanceId, at]);
}
