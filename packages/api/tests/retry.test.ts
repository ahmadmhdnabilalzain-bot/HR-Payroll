import { describe, expect, it } from "vitest";
import {
  needsEmailFallback,
  nextDeliveryAttempt,
} from "../src/channels/retry";

const now = new Date("2026-03-01T10:00:00.000Z");
const plus = (min: number) =>
  new Date(now.getTime() + min * 60_000).toISOString();

describe("delivery retries", () => {
  it("email waits 1, 5, 30 minutes, then gives up", () => {
    expect([1, 2, 3].map((n) => nextDeliveryAttempt("email", n, now)
      ?.toISOString())).toEqual([plus(1), plus(5), plus(30)]);
    expect(nextDeliveryAttempt("email", 4, now)).toBeNull();
  });
  it("WhatsApp gives up after three attempts", () => {
    expect(nextDeliveryAttempt("whatsapp", 2, now)?.toISOString())
      .toBe(plus(5));
    expect(nextDeliveryAttempt("whatsapp", 3, now)).toBeNull();
  });
  it("falls back to email unless a code or an email row exists", () => {
    expect(needsEmailFallback("failed", "approval-pending", false))
      .toBe(true);
    expect(needsEmailFallback("failed", "approval-pending", true))
      .toBe(false);
    expect(needsEmailFallback("skipped", "channel-verify-code", false))
      .toBe(false);
  });
});
