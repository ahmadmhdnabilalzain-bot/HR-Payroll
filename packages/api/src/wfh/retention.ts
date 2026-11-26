import { timeAudit } from "../audit/time-audit";
import type { Db } from "../db/db";
import { getWfhSettings } from "./settings";

/**
 * The oldest instant still kept: now minus the company's retention
 * (the setting, else the last notice's period). Null when no period
 * was ever set (then nothing can have been collected).
 */
export async function wfhCutoff(tx: Db, companyId: string, now: Date)
  : Promise<string | null> {
  const s = await getWfhSettings(tx, companyId);
  let days = s.retentionDays;
  if (days === null) {
    const [n] = await tx.query<{ retention_days: number }>(
      `SELECT retention_days FROM wfh_notices WHERE company_id = $1
       ORDER BY version DESC LIMIT 1`, [companyId]);
    days = n?.retention_days ?? null;
  }
  return days === null ? null
    : new Date(now.getTime() - days * 86_400_000).toISOString();
}

async function del(tx: Db, sql: string, args: unknown[]): Promise<number> {
  return (await tx.query(`${sql} RETURNING 1`, args)).length;
}

/**
 * Deletes samples older than the cutoff and closed pauses that ended
 * before it (PDPL Art 5(7): kept no longer than needed). Audits the
 * three counts only, and only when something was deleted.
 */
export async function purgeExpiredWfh(tx: Db, now: Date, companyId: string,
  actorUserId: string | null)
  : Promise<{ activity: number; locations: number; pauses: number }> {
  const cutoff = await wfhCutoff(tx, companyId, now);
  if (cutoff === null) return { activity: 0, locations: 0, pauses: 0 };
  const args = [companyId, cutoff];
  const out = {
    activity: await del(tx, "DELETE FROM wfh_activity_minutes WHERE " +
      "company_id = $1 AND at < $2", args),
    locations: await del(tx, "DELETE FROM wfh_location_samples WHERE " +
      "company_id = $1 AND at < $2", args),
    // Closed pauses that ended, and open ones that started, before it.
    pauses: await del(tx, "DELETE FROM wfh_pauses WHERE company_id = $1 " +
      "AND coalesce(ended_at, started_at) < $2", args),
  };
  if (out.activity + out.locations + out.pauses > 0) {
    await timeAudit(tx, { companyId, at: now.toISOString(), actorUserId,
      action: "wfh.purged", entityType: "wfh-data", entityId: null,
      data: out });
  }
  return out;
}
