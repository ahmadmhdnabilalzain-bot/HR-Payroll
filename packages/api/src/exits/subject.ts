import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { leaverLogins } from "./leaver-logins";

/**
 * The caller is the person leaving: linked to the employee record, or
 * a login with the employee's email that HR has not confirmed as
 * someone else's (Plan 8 review I-2).
 */
export async function isSubject(ctx: ReqCtx,
  x: { id: string; employeeId: string }): Promise<boolean> {
  if (ctx.tenant!.employeeId === x.employeeId) return true;
  const ls = await leaverLogins(ctx.tx, ctx.tenant!.companyId, x);
  return ls.some((l) => l.userId === ctx.user!.id && !l.confirmedOther);
}

/** 403 SOD_VIOLATION when the caller is the person leaving. */
export async function assertNotSubject(ctx: ReqCtx,
  x: { id: string; employeeId: string }): Promise<void> {
  if (await isSubject(ctx, x)) throw new ApiError("SOD_VIOLATION");
}
