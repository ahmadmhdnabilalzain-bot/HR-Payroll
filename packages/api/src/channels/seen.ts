import type { Db } from "../db/db";

/**
 * Records a provider's message id once per company: true the first
 * time, false for a retry or duplicate (a unique key, no race).
 */
export async function markSeen(tx: Db, companyId: string, provider: string,
  messageId: string, now: Date): Promise<boolean> {
  const rows = await tx.query(
    `INSERT INTO inbound_seen (company_id, provider, message_id, seen_at)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING message_id`,
    [companyId, provider, messageId, now.toISOString()]);
  return rows.length === 1;
}
