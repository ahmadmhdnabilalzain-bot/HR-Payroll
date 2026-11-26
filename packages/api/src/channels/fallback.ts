import type { DeliverySkipReason, NotificationKind } from "@payroll/contract";
import { insertDelivery, type EventCtx } from "./notify";
import { needsEmailFallback } from "./retry";

/** The outbox row as the dispatcher and the fallback read it. */
export interface DeliveryRowDb {
  id: string;
  company_id: string;
  notification_id: string | null;
  user_id: string;
  channel: "email" | "whatsapp";
  kind: NotificationKind;
  status: string;
  attempts: number;
  not_before: string | null;
  lease_until: string | null;
  language_fallback: boolean;
  payload_enc: string;
}

async function emailExists(c: EventCtx, noticeId: string | null) {
  if (noticeId === null) return false;
  const r = await c.tx.query(
    `SELECT 1 FROM notification_deliveries WHERE company_id = $1
       AND notification_id = $2 AND channel = 'email'
       AND status <> 'skipped'`, [c.companyId, noticeId]);
  return r.length > 0;
}

/**
 * A WhatsApp notice that will not be delivered gets one email row
 * (queued, never held) when no email row for the notice is going out
 * (Ruling 14). Returns whether one was added.
 */
export async function emailFallback(c: EventCtx, d: DeliveryRowDb,
  outcome: "failed" | "not-configured" | "skipped", payload: string)
  : Promise<boolean> {
  if (d.channel !== "whatsapp") return false;
  if (!needsEmailFallback(outcome, d.kind,
    await emailExists(c, d.notification_id))) return false;
  await insertDelivery(c, { r: { userId: d.user_id, kind: d.kind, vars: {},
    link: null }, plan: { channel: "email", skip: null },
  noticeId: d.notification_id, payload, heldUntil: null,
  fallback: d.language_fallback }, d.id);
  return true;
}

/** Ends a row as skipped (with its reason), then falls back. */
export async function skipDelivery(c: EventCtx, d: DeliveryRowDb,
  reason: DeliverySkipReason, payload: string): Promise<boolean> {
  await c.tx.query(
    `UPDATE notification_deliveries SET status = 'skipped', reason = $3,
       lease_until = NULL WHERE company_id = $1 AND id = $2`,
    [c.companyId, d.id, reason]);
  return emailFallback(c, d, "skipped", payload);
}
