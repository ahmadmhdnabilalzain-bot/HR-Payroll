import type { AuditData } from "@payroll/contract";
import { timeAudit } from "../audit/time-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

/** Small helpers shared by Plan 9 handlers. */
export const co = (ctx: ReqCtx): string => ctx.tenant!.companyId;
export const nowIso = (ctx: ReqCtx): string =>
  ctx.deps.now().toISOString();

/** One audit row through `timeAudit`, actor = the caller. */
export async function audit(ctx: ReqCtx, action: string,
  entityType: string, entityId: string | null, data: AuditData = {})
  : Promise<void> {
  await timeAudit(ctx.tx, { companyId: co(ctx), at: nowIso(ctx),
    actorUserId: ctx.user!.id, action, entityType, entityId, data });
}

/** The caller's linked employee, else 422 NO_EMPLOYEE_LINK. */
export function selfEmployee(ctx: ReqCtx): string {
  const id = ctx.tenant!.employeeId;
  if (id === null) throw new ApiError("NO_EMPLOYEE_LINK");
  return id;
}

/** The names of the keys a patch body sets, sorted. */
export function changedKeys(body: Record<string, unknown>): string[] {
  return Object.keys(body).filter((k) => body[k] !== undefined).sort();
}
