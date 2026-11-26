import { emailFallback, type DeliveryRowDb } from "./fallback";
import type { EventCtx } from "./notify";
import type { SendOutcome } from "./ports";
import { nextDeliveryAttempt } from "./retry";

/** The sealed message of one outbox row. */
export interface Payload {
  subject: string;
  text: string;
  language: "en" | "ar";
  templateName: string | null;
  params: string[];
  /** WhatsApp quick-reply payloads (signed action tokens, Task 4). */
  buttons?: string[];
  vars: Record<string, string>;
  /** Event facts for the send step (approval id and step, Task 4). */
  meta?: Record<string, string>;
}

export type Result = "sent" | "failed" | "retried" | "skipped";

async function set(c: EventCtx, id: string, sql: string, args: unknown[]) {
  await c.tx.query(`UPDATE notification_deliveries SET ${sql},
    lease_until = NULL WHERE company_id = $1 AND id = $2`,
  [c.companyId, id, ...args]);
}

/** Records a send's outcome; a lost WhatsApp notice falls back. */
export async function recordOutcome(c: EventCtx, d: DeliveryRowDb,
  p: Payload, o: SendOutcome)
  : Promise<{ result: Result; fellBack: boolean }> {
  const now = c.deps.now();
  if (o.status === "sent") {
    await set(c, d.id, "status = 'sent', sent_at = $3, provider = $4, " +
      "provider_message_id = $5", [now.toISOString(), d.channel,
      o.providerMessageId]);
    return { result: "sent", fellBack: false };
  }
  if (o.status === "failed" && o.retryable) {
    const next = nextDeliveryAttempt(d.channel, d.attempts, now);
    if (next !== null) {
      await set(c, d.id, "status = 'queued', not_before = $3, reason = $4",
        [next.toISOString(), o.code]);
      return { result: "retried", fellBack: false };
    }
  }
  const status = o.status === "failed" ? "failed" : "not-configured";
  await set(c, d.id, "status = $3, reason = $4", [status,
    o.status === "failed" ? o.code : "not-configured"]);
  const fellBack = await emailFallback(c, d, status, JSON.stringify(p));
  return { result: o.status === "failed" ? "failed" : "skipped",
    fellBack };
}
