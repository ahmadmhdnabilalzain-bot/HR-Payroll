import type { FileCtx } from "./files";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";

/**
 * Uploads per user and per company per Dubai day: product defaults,
 * not statutory (each upload is up to 10 MiB, and unclaimed files
 * wait for the sweeper).
 */
export const FILE_QUOTA = Object.freeze({ perUserPerDay: 50,
  perCompanyPerDay: 1000 });

/**
 * Refuses an upload over the quota with 429 FILE_QUOTA_EXCEEDED
 * (generated letter PDFs do not count). A per-company advisory lock
 * serialises the count and the insert.
 */
export async function checkFileQuota(ctx: FileCtx): Promise<void> {
  const c = ctx.tenant!.companyId;
  await ctx.tx.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 7))",
    [`files:${c}`]);
  const since = `${dubaiDate(ctx.deps.now())}T00:00:00+04:00`;
  const [r] = await ctx.tx.query<{ mine: number; all: number }>(
    `SELECT count(*) FILTER (WHERE uploaded_by = $2)::int AS mine,
       count(*)::int AS all FROM files
     WHERE company_id = $1 AND uploaded_at >= $3::timestamptz
       AND coalesce(attached_to, '') NOT LIKE 'letter:%'`,
    [c, ctx.user!.id, since]);
  const scope = (r?.mine ?? 0) >= FILE_QUOTA.perUserPerDay ? "user"
    : (r?.all ?? 0) >= FILE_QUOTA.perCompanyPerDay ? "company" : null;
  if (scope !== null) {
    throw new ApiError("FILE_QUOTA_EXCEEDED", undefined, { scope });
  }
}
