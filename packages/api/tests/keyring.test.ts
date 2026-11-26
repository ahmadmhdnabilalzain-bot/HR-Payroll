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
    expect(c).toMatch(/^v1\.[\w-]+$/);
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
  it("refuses a key that is not 32 bytes", () => {
    expect(() => keyringFromKey(new Uint8Array(16), (n) => randomBytes(n)))
      .toThrow(/32 bytes/);
  });
});
