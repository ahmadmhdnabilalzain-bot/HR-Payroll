import type { ErrorCode } from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeRefs } from "./roster-write";

export interface Decidable {
  employeeIds: string[];
  requestedByUserId: string;
  status: string;
}

/**
 * Plan 9's one approval check, in this order: role owner, hr or
 * manager (403 FORBIDDEN); the caller is none of the employees and not
 * the requester (403 SOD_VIOLATION); a manager manages every employee
 * directly (404); the status equals `pendingStatus` (409
 * `notPendingCode`; `null` skips this check).
 */
export async function assertTimeDecidable(ctx: ReqCtx, s: Decidable,
  pendingStatus: string | null, notPendingCode: ErrorCode)
  : Promise<void> {
  const t = ctx.tenant!;
  if (!["owner", "hr", "manager"].includes(t.role)) {
    throw new ApiError("FORBIDDEN");
  }
  const own = t.employeeId !== null && s.employeeIds.includes(t.employeeId);
  if (own || s.requestedByUserId === ctx.user!.id) {
    throw new ApiError("SOD_VIOLATION");
  }
  if (t.role === "manager") {
    const refs = await employeeRefs(ctx.tx, t.companyId, s.employeeIds);
    const all = refs.length === new Set(s.employeeIds).size &&
      refs.every((r) => r.manager_id === t.employeeId);
    if (!all) throw new ApiError("NOT_FOUND");
  }
  if (pendingStatus !== null && s.status !== pendingStatus) {
    throw new ApiError(notPendingCode);
  }
}
