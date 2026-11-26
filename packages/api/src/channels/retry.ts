import type { NotificationKind } from "@payroll/contract";

/** Minutes before each retry (product defaults, not provider rules). */
export const DELIVERY_RETRY_MINUTES = {
  email: [1, 5, 30],
  whatsapp: [1, 5],
} as const;

/** Pure: when to try again after `attemptsMade`, or null to give up. */
export function nextDeliveryAttempt(channel: "email" | "whatsapp",
  attemptsMade: number, now: Date): Date | null {
  const wait = DELIVERY_RETRY_MINUTES[channel][attemptsMade - 1];
  if (wait === undefined) return null;
  return new Date(now.getTime() + wait * 60_000);
}

/**
 * Pure: a WhatsApp notice that was not delivered falls back to email,
 * unless it is a verification code or an email row already exists
 * for the notice (Ruling 14).
 */
export function needsEmailFallback(_outcome: "failed" | "not-configured" |
  "skipped", kind: NotificationKind, emailDeliveryExists: boolean)
  : boolean {
  return kind !== "channel-verify-code" && !emailDeliveryExists;
}
