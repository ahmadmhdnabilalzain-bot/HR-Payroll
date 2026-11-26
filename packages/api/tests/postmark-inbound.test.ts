import { describe, expect, it } from "vitest";
import {
  postmarkInbound,
  readAuthHeaders,
} from "../src/inbound/postmark-inbound";
import { INBOUND_BASIC, postmarkPayload } from "./helpers/email-in";

const h = (Name: string, Value: string) => ({ Name, Value });

describe("postmark inbound adapter", () => {
  it("reads the provider's own topmost Authentication-Results", () => {
    const mx = "mx.example";
    expect(readAuthHeaders([h("Authentication-Results", "mx.example; " +
      "spf=pass smtp.mailfrom=a.test; dkim=pass header.d=a.test; " +
      "dmarc=pass")], mx)).toMatchObject({ spf: "pass", dkim: "pass",
      dmarc: "pass", spfDomain: "a.test", dkimDomain: "a.test" });
    expect(readAuthHeaders([], mx)).toMatchObject({ spf: "none",
      dkim: "none", dmarc: "none" });
    expect(readAuthHeaders([h("Authentication-Results",
      "MX.example; spf=weird")], mx).spf).toBe("unknown");
  });
  it("I1: a forged header never gives a pass", () => {
    const mx = "mx.example";
    const forged = h("Authentication-Results", "attacker.example; " +
      "spf=pass smtp.mailfrom=a.test; dkim=pass header.d=a.test; " +
      "dmarc=pass");
    const real = h("Authentication-Results",
      "mx.example; spf=fail smtp.mailfrom=a.test; dkim=none; dmarc=fail");
    // Forged above the real one: unverified, not a pass.
    expect(readAuthHeaders([forged, real], mx)).toMatchObject({
      spf: "none", dkim: "none", dmarc: "none", spfDomain: null });
    // A forged header with the right id below the real one: ignored.
    const forgedId = h("Authentication-Results", "mx.example; spf=pass " +
      "smtp.mailfrom=a.test; dkim=pass header.d=a.test; dmarc=pass");
    expect(readAuthHeaders([real, forgedId], mx)).toMatchObject({
      spf: "fail", dmarc: "fail" });
    // No configured id: everything unverified.
    expect(readAuthHeaders([real], null).spf).toBe("none");
    // Received-SPF only when it names the provider and no A-R exists.
    expect(readAuthHeaders([h("Received-SPF",
      "Pass (ok) receiver=mx.example; client-ip=1.2.3.4")], mx).spf)
      .toBe("pass");
    expect(readAuthHeaders([h("Received-SPF",
      "Pass (ok) receiver=attacker.example")], mx).spf).toBe("none");
    expect(readAuthHeaders([h("Received-SPF", "Pass (sender ok)")], mx)
      .spf).toBe("none");
  });
  it("checks Basic credentials and the payload shape", () => {
    const a = postmarkInbound({ basicAuth: INBOUND_BASIC,
      authservId: "mx.test" });
    const good = `Basic ${Buffer.from(INBOUND_BASIC).toString("base64")}`;
    expect(a.authenticate(good)).toBe(true);
    expect(a.authenticate("Basic eDp5")).toBe(false);
    expect(a.authenticate(undefined)).toBe(false);
    const p = postmarkPayload({ from: "a@b.test", hash: "h" });
    expect(a.parse(p).from).toBe("a@b.test");
    const { MailboxHash: _m, ...missing } = p;
    expect(() => a.parse(missing)).toThrow(
      expect.objectContaining({ code: "INBOUND_PAYLOAD_INVALID" }));
  });
});
