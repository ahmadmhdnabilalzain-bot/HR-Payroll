import type { Db } from "../db/db";

/** Pure: the start (Unix seconds) of the fixed window holding `nowMs`. */
export function windowStart(nowMs: number, windowSec: number): number {
  return Math.floor(nowMs / 1000 / windowSec) * windowSec;
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Counts one use in a fixed window (product defaults, never provider
 * limits). Every call counts, allowed or not. Atomic under concurrency
 * (one upsert).
 */
export async function consumeRate(tx: Db, companyId: string, scope: string,
  key: string, limit: number, windowSec: number, now: Date)
  : Promise<RateResult> {
  const start = windowStart(now.getTime(), windowSec);
  const [r] = await tx.query<{ count: number }>(
    `INSERT INTO rate_counters (company_id, scope, key, window_start,
       count) VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (company_id, scope, key, window_start)
     DO UPDATE SET count = rate_counters.count + 1
     RETURNING count`, [companyId, scope, key, start]);
  const count = r!.count;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count),
    resetAt: new Date((start + windowSec) * 1000) };
}
