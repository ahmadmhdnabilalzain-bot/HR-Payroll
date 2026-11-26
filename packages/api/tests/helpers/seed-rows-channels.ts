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
  await admin.query(
    `INSERT INTO notifications (id, company_id, user_id, kind, title, body,
       created_at) VALUES ($1, $2, $3, 'inbound-received', 't', 'b', $4)`,
    [rowId(c, "d1"), c, user, AT]);
  await admin.query(
    `INSERT INTO notification_prefs (company_id, user_id, body,
       updated_at) VALUES ($1, $2, '{}', $3)`, [c, user, AT]);
  await admin.query(
    `INSERT INTO notification_deliveries (id, company_id, notification_id,
       user_id, channel, kind, status, created_at)
     VALUES ($1, $2, $3, $4, 'email', 'inbound-received', 'sent', $5)`,
    [rowId(c, "d2"), c, rowId(c, "d1"), user, AT]);
  await admin.query(
    `INSERT INTO channel_opt_ins (id, company_id, user_id, channel,
       phone_enc, phone_hash, phone_last4, status, consent_version,
       created_at) VALUES ($1, $2, $3, 'whatsapp', 'x', $4, '0000',
       'pending', 1, $5)`, [rowId(c, "d3"), c, user, `h-${c}`, AT]);
  await admin.query(
    `INSERT INTO channel_verify_codes (company_id, opt_in_id, code_hash,
       expires_at) VALUES ($1, $2, 'x', $3)`, [c, rowId(c, "d3"), AT]);
  await admin.query(
    `INSERT INTO channel_actions (id, company_id, approval_id, step_order,
       recipient_user_id, phone_hash, delivery_id, status, expires_at,
       created_at) VALUES ($1, $2, $3, 1, $4, 'h', $5, 'open', $6, $6)`,
    [rowId(c, "d4"), c, rowId(c, "c2"), user, rowId(c, "d2"), AT]);
  await seedInbound(admin, c, user);
}

async function seedInbound(admin: Db, c: string, user: string) {
  await admin.query(
    `INSERT INTO inbound_mailboxes (company_id, secret_hash, secret_enc,
       version, rotated_at) VALUES ($1, 'h', 'x', 1, $2)`, [c, AT]);
  await admin.query(
    `INSERT INTO inbound_settings (company_id, version, body, updated_by,
       updated_at) VALUES ($1, 1, '{}', $2, $3)`, [c, user, AT]);
  await admin.query(
    `INSERT INTO inbound_items (id, company_id, status, received_at,
       message_id, auth) VALUES ($1, $2, 'rejected', $3, 'm', '{}')`,
    [rowId(c, "d5"), c, AT]);
  await admin.query(
    `INSERT INTO inbound_attachments (id, company_id, item_id, idx,
       file_name, size, status, skip)
     VALUES ($1, $2, $3, 0, 'x', 1, 'skipped', 'TOO_MANY')`,
    [rowId(c, "d6"), c, rowId(c, "d5")]);
  await admin.query(
    `INSERT INTO calendar_feeds (id, company_id, user_id, scope,
       secret_hash, url_hint, status, created_at)
     VALUES ($1, $2, $3, 'my', 'h', 'x', 'revoked', $4)`,
    [rowId(c, "d7"), c, user, AT]);
  await admin.query(
    `INSERT INTO sso_settings (company_id, version, body, updated_by,
       updated_at) VALUES ($1, 1, '{}', $2, $3)`, [c, user, AT]);
}
