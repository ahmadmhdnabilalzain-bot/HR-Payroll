import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { webhookSignature } from "../src/webhooks/sign";
import { checkWebhookUrl, isPublicAddress } from "../src/webhooks/url-guard";

describe("webhook URL guard", () => {
  it("allows https public names only", () => {
    expect(checkWebhookUrl("https://hooks.example.test/x").ok).toBe(true);
    for (const u of ["http://hooks.example.test",
      "https://user:pw@hooks.example.test", "https://hooks.example.test:8443",
      "https://127.0.0.1/x", "https://[::1]/x", "https://localhost/x",
      "https://db.internal/x", "https://printer.local/x",
      "https://intranet/x"]) expect(checkWebhookUrl(u).ok, u).toBe(false);
  });
  it("isPublicAddress", () => {
    for (const ip of ["10.1.2.3", "172.31.0.1", "192.168.1.1",
      "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "fe80::1",
      "::ffff:10.0.0.1", "0.0.0.0", "::"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
    expect(isPublicAddress("93.184.216.34")).toBe(true);
    expect(isPublicAddress("2606:4700::1111")).toBe(true);
  });
});

describe("webhookSignature", () => {
  it("is HMAC-SHA256 over id.timestamp.body, current first", () => {
    const want = createHmac("sha256", "s1").update("evt_1.100.{}")
      .digest("hex");
    expect(webhookSignature(["s1"], "evt_1", 100, "{}")).toBe(`v1=${want}`);
    const two = webhookSignature(["s1", "s0"], "evt_1", 100, "{}");
    expect(two.split(",")).toHaveLength(2);
    expect(two.startsWith(`v1=${want},v1=`)).toBe(true);
    expect(webhookSignature(["s1"], "evt_1", 100, "{ }")).not.toBe(
      `v1=${want}`);
  });
});
