import type { Role } from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

/**
 * The one approval rule for requisitions, offers and exits (Ruling
 * 15): the role may decide (403 FORBIDDEN), the item is still pending
 * (409 APPROVAL_NOT_PENDING) and the caller did not request it (403
 * SOD_VIOLATION).
 */
export function assertDecidable(ctx: ReqCtx,
  item: { status: string; requestedBy: string },
  opts: { pending: string; roles: readonly Role[] }): void {
  if (!opts.roles.includes(ctx.tenant!.role)) {
    throw new ApiError("FORBIDDEN");
  }
  if (item.status !== opts.pending) {
    throw new ApiError("APPROVAL_NOT_PENDING");
  }
  if (item.requestedBy === ctx.user!.id) {
    throw new ApiError("SOD_VIOLATION");
  }
}
