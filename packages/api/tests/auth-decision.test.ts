import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { senderAuthDecision } from "../src/inbound/auth-decision";
import { matchSender } from "../src/inbound/sender";

const V = ["pass", "fail", "softfail", "neutral", "none", "unknown"] as const;
const own = { spfDomain: "acme.test", dkimDomain: "acme.test" };
const d = (spf: string, dkim: string, dmarc: string, extra = {}) =>
  senderAuthDecision({ spf, dkim, dmarc, ...extra } as never, "acme.test");

describe("senderAuthDecision", () => {
  it("follows the plan's table", () => {
    expect(d("pass", "pass", "pass", own)).toBe("pass");
    expect(d("fail", "none", "none")).toBe("reject");
    expect(d("pass", "fail", "none", own)).toBe("flag");
    expect(d("none", "fail", "none")).toBe("reject");
    expect(d("pass", "pass", "fail", own)).toBe("reject");
    expect(d("none", "none", "pass")).toBe("pass");
    expect(d("none", "none", "none")).toBe("flag");
  });
  it("passes for another domain only flag (stricter than the plan)",
    () => {
      expect(d("pass", "pass", "none", { spfDomain: "attacker.test",
        dkimDomain: "attacker.test" })).toBe("flag");
      expect(d("pass", "pass", "none")).toBe("flag");
      expect(d("pass", "pass", "none", { dkimDomain: "mail.acme.test" }))
        .toBe("pass");
      expect(d("pass", "pass", "none", { dkimDomain: "notacme.test" }))
        .toBe("flag");
    });
  it("any SPF fail is a reject", () => {
    fc.assert(fc.property(fc.constantFrom(...V), fc.constantFrom(...V),
      (dkim, dmarc) => d("fail", dkim, dmarc, own) === "reject"));
  });
});

describe("matchSender", () => {
  const emps = [{ id: "e1", email: "sara@acme.test" },
    { id: "e2", email: null }];
  const allow = ["@vendor.test", "ap@other.test"];
  it("matches employees exactly, then the allow-list", () => {
    expect(matchSender("Sara@Acme.test", emps, allow))
      .toEqual({ allowed: true, employeeId: "e1" });
    expect(matchSender("ap@vendor.test", emps, allow))
      .toEqual({ allowed: true, employeeId: null });
    expect(matchSender("ap@mail.vendor.test", emps, allow).allowed)
      .toBe(false);
    expect(matchSender("x@unknown.test", emps, allow).allowed).toBe(false);
    expect(matchSender("ap@other.test", emps, allow).allowed).toBe(true);
    expect(matchSender("null", emps, allow).allowed).toBe(false);
  });
});
