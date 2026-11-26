import { getPolicy } from "../expenses/policy-store";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";

/**
 * Receipt uploads per user and per company per Dubai day (the
 * company's `receiptQuota`, a product default, not statutory). A
 * per-company advisory lock serialises the count and the insert, so
 * parallel uploads cannot pass the cap together.
 */
export async function checkQuota(ctx: ReqCtx): Promise<void> {
  const c = ctx.tenant!.companyId;
  await ctx.tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 6))",
    [`receipts:${c}`]);
  const q = (await getPolicy(ctx.tx, c)).receiptQuota;
  const since = `${dubaiDate(ctx.deps.now())}T00:00:00+04:00`;
  const [r] = await ctx.tx.query<{ mine: number; all: number }>(
    `SELECT count(*) FILTER (WHERE uploaded_by = $2)::int AS mine,
       count(*)::int AS all FROM receipts
     WHERE company_id = $1 AND uploaded_at >= $3::timestamptz`,
    [c, ctx.user!.id, since]);
  if ((r?.mine ?? 0) >= q.perUserPerDay) {
    throw new ApiError("RECEIPT_QUOTA_EXCEEDED", undefined,
      { scope: "user" });
  }
  if ((r?.all ?? 0) >= q.perCompanyPerDay) {
    throw new ApiError("RECEIPT_QUOTA_EXCEEDED", undefined,
      { scope: "company" });
  }
}
