import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { keyringFromKey } from "../src/crypto/keyring";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const kek = new Uint8Array(32).fill(7);
const ring = keyringFromKey(kek, (n) => randomBytes(n));
const aad = (c: string) => `${c}:employees:salary_enc:row-1`;

describe("keyring (AES-256-GCM)", () => {
  const { dekWrapped: dekA } = ring.wrapNewDek(A);
  const { dekWrapped: dekB } = ring.wrapNewDek(B);

  it("round-trips and uses the v1 format", () => {
    const c = ring.encrypt(dekA, aad(A), "7777.77");
    expect(c).toMatch(/^v1\.[0-9a-f]{8}\.[\w-]+$/);
    expect(c).not.toContain("7777");
    expect(ring.decrypt(dekA, aad(A), c)).toBe("7777.77");
  });
  it("refuses another AAD", () => {
    const c = ring.encrypt(dekA, aad(A), "secret");
    expect(() => ring.decrypt(dekA, `${A}:employees:iban_enc:row-1`, c))
      .toThrow();
  });
  it("refuses another company's DEK", () => {
    const c = ring.encrypt(dekA, aad(A), "secret");
    expect(() => ring.decrypt(dekB, aad(A), c)).toThrow();
    expect(() => ring.encrypt(dekA, aad(B), "x")).toThrow();
  });
  it("two encryptions of one plaintext differ", () => {
    expect(ring.encrypt(dekA, aad(A), "same"))
      .not.toBe(ring.encrypt(dekA, aad(A), "same"));
  });
  it("global encryption round-trips and checks the AAD", () => {
    const c = ring.encryptGlobal("users:mfa_secret:u1", "JBSWY3DP");
    expect(ring.decryptGlobal("users:mfa_secret:u1", c)).toBe("JBSWY3DP");
    expect(() => ring.decryptGlobal("users:mfa_secret:u2", c)).toThrow();
  });
  it("keeps DEK wrapping and global values apart", () => {
    expect(() => ring.encrypt(dekA, "global:x", "v")).toThrow(/company/);
    const g = ring.encryptGlobal(`${A}:dek`, "not a dek");
    expect(() => ring.decrypt(g, aad(A), ring.encrypt(dekA, aad(A), "x")))
      .toThrow();
  });
  it("names the master key and refuses another one's cipher", () => {
    const other = keyringFromKey(new Uint8Array(32).fill(9),
      (n) => randomBytes(n));
    const c = other.encryptGlobal("users:mfa_secret:u1", "x");
    expect(() => ring.decryptGlobal("users:mfa_secret:u1", c))
      .toThrow(/another master key/);
  });
  it("refuses a cipher with a short or cut tag", () => {
    const c = ring.encrypt(dekA, aad(A), "secret");
    const [v, kid, body] = c.split(".");
    const packed = Buffer.from(body!, "base64url");
    // 12-byte IV, then only 4 bytes of tag and no cipher text.
    const short = `${v}.${kid}.${packed.subarray(0, 16)
      .toString("base64url")}`;
    expect(() => ring.decrypt(dekA, aad(A), short)).toThrow(/too short/);
    const iv = packed.subarray(0, 12);
    const fourByteTag = Buffer.concat([iv, packed.subarray(12, 16),
      packed.subarray(28)]);
    expect(() => ring.decrypt(dekA, aad(A),
      `${v}.${kid}.${fourByteTag.toString("base64url")}`)).toThrow();
  });
  it("a company key unwraps once and keeps the same rules", () => {
    const k = ring.companyKey(dekA, A);
    const c = k.encrypt(aad(A), "7777.77");
    expect(ring.decrypt(dekA, aad(A), c)).toBe("7777.77");
    expect(k.decrypt(aad(A), ring.encrypt(dekA, aad(A), "x"))).toBe("x");
    expect(() => k.encrypt(aad(B), "x")).toThrow(/company/);
  });
  it("company MACs are stable per company and differ across them", () => {
    const a1 = ring.companyKey(dekA, A).mac("iban", "AE07");
    expect(ring.companyKey(dekA, A).mac("iban", "AE07")).toBe(a1);
    expect(a1).toMatch(/^[0-9a-f]{64}$/);
    expect(ring.companyKey(dekB, B).mac("iban", "AE07")).not.toBe(a1);
    expect(ring.companyKey(dekA, A).mac("labour", "AE07")).not.toBe(a1);
  });
  it("refuses a key that is not 32 bytes", () => {
    expect(() => keyringFromKey(new Uint8Array(16), (n) => randomBytes(n)))
      .toThrow(/32 bytes/);
  });
});
