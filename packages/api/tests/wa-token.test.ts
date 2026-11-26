import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { signAction, verifyAction } from "../src/whatsapp/token";

const KEY = new Uint8Array(32).fill(3);
const OTHER = new Uint8Array(32).fill(4);
const C = "00000000-0000-4000-8000-00000000000a";
const A = "00000000-0000-4000-8000-0000000000a1";
const EXP = 1_800_000_000;
const tok = (k = KEY, d: "a" | "r" = "a") => signAction(k,
  { companyId: C, actionId: A, decision: d, expiresAt: EXP });

describe("WhatsApp action tokens", () => {
  it("token_round_trip", () => {
    const t = tok();
    expect(t.length).toBeLessThanOrEqual(200);
    expect(verifyAction(KEY, t, EXP - 10)).toEqual({ companyId: C,
      actionId: A, decision: "a" });
  });

  it("token_tamper", () => {
    const t = tok();
    const swapDecision = t.replace(".a.", ".r.");
    expect(verifyAction(KEY, swapDecision, EXP - 1)).toBe("bad-signature");
    const last = t.at(-1) === "A" ? "B" : "A";
    expect(verifyAction(KEY, t.slice(0, -1) + last, EXP - 1))
      .toBe("bad-signature");
    const otherCompany = t.replace(C, "00000000-0000-4000-8000-00000000000b");
    expect(verifyAction(KEY, otherCompany, EXP - 1)).toBe("bad-signature");
    expect(verifyAction(KEY, tok(OTHER), EXP - 1)).toBe("bad-signature");
    expect(verifyAction(KEY, "wa1.x", EXP - 1)).toBe("malformed");
    expect(verifyAction(KEY, `${t}x`, EXP - 1)).toBe("malformed");
    expect(verifyAction(KEY, t, EXP + 1)).toBe("expired");
    expect(verifyAction(KEY, t, EXP)).not.toBe("expired");
  });

  it("verifies what it signs, for any ids and expiry", () => {
    fc.assert(fc.property(fc.uuid({ version: 4 }), fc.uuid({ version: 4 }),
      fc.constantFrom("a" as const, "r" as const),
      fc.integer({ min: 1, max: 99_999_999_999 }), (c, a, d, exp) => {
        const t = signAction(KEY, { companyId: c, actionId: a,
          decision: d, expiresAt: exp });
        expect(verifyAction(KEY, t, exp - 1)).toEqual({ companyId: c,
          actionId: a, decision: d });
      }));
  });
});
