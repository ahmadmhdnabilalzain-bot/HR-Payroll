import type { Db } from "../../src/db/db";

const AT = "2026-03-01T08:00:00.000Z";

/** A uuid made from a 2-hex-digit slot and the company id. */
const rowId = (c: string, slot: string) => `${slot}${c.slice(2)}`;

/**
 * One row in every Plan 13 tenant table for company `c` (admin handle,
 * past RLS). `emp` is a seeded employee, `user` a seeded user. Each
 * task adds its tables.
 */
export async function seedChannelRows(admin: Db, c: string, _emp: string,
  user: string): Promise<void> {
  await admin.query(
    `INSERT INTO channel_settings (company_id, version, body, updated_by,
       updated_at) VALUES ($1, 1, '{}', $2, $3)`, [c, user, AT]);
  await admin.query(
    `INSERT INTO rate_counters (company_id, scope, key, window_start,
       count) VALUES ($1, 'seed', 'k', 0, 1)`, [c]);
  await admin.query(
    `INSERT INTO inbound_seen (company_id, provider, message_id, seen_at)
     VALUES ($1, 'seed', $2, $3)`, [c, rowId(c, "d9"), AT]);
}
