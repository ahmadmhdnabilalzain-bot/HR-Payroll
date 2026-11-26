import { createHmac } from "node:crypto";

/** Consumers should reject older requests (documented, not enforced). */
export const WEBHOOK_TOLERANCE_SEC = 300;

/** Pure: `v1=<hex HMAC-SHA256(secret, id.ts.body)>` per secret, current
 * first, joined by commas. */
export function webhookSignature(secrets: string[], id: string,
  timestampSec: number, body: string): string {
  return secrets.map((s) => "v1=" + createHmac("sha256", s)
    .update(`${id}.${timestampSec}.${body}`).digest("hex")).join(",");
}

/** Minutes between attempts: 8 attempts over about 45 hours (default). */
export const WEBHOOK_RETRY_MINUTES = [1, 5, 30, 120, 360, 720, 1440];
export const PAUSE_AFTER_FAILED_DELIVERIES = 5;
export const ENDPOINTS_PER_COMPANY = 10;

/** Pure: the next attempt after `attemptsMade`, or null to stop. */
export function nextWebhookAttempt(attemptsMade: number, now: Date)
  : Date | null {
  const wait = WEBHOOK_RETRY_MINUTES[attemptsMade - 1];
  return wait === undefined ? null : new Date(now.getTime() + wait * 60_000);
}
