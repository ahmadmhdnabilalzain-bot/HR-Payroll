import { describe, expect, it } from "vitest";
import {
  postmarkInbound,
  readAuthHeaders,
} from "../src/inbound/postmark-inbound";
import { INBOUND_BASIC, postmarkPayload } from "./helpers/email-in";

const h = (Name: string, Value: string) => ({ Name, Value });

describe("postmark inbound adapter", () => {
  it("reads Authentication-Results and Received-SPF", () => {
    expect(readAuthHeaders([h("Authentication-Results", "mx.example; " +
      "spf=pass smtp.mailfrom=a.test; dkim=pass header.d=a.test; " +
      "dmarc=pass")])).toMatchObject({ spf: "pass", dkim: "pass",
      dmarc: "pass", spfDomain: "a.test", dkimDomain: "a.test" });
    expect(readAuthHeaders([])).toMatchObject({ spf: "none",
      dkim: "none", dmarc: "none" });
    expect(readAuthHeaders([h("Received-SPF", "Pass (sender ok)")]).spf)
      .toBe("pass");
    expect(readAuthHeaders([h("Authentication-Results",
      "mx; spf=weird")]).spf).toBe("unknown");
  });
  it("checks Basic credentials and the payload shape", () => {
    const a = postmarkInbound({ basicAuth: INBOUND_BASIC });
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
