import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { base32Encode, totpCode, verifyTotp } from "../src/auth/totp";

const seed = new TextEncoder().encode("12345678901234567890");

describe("totp (RFC 6238, SHA-1)", () => {
  it("matches the RFC test vectors", () => {
    expect(totpCode(seed, 59, 8)).toBe("94287082");
    expect(totpCode(seed, 1111111109, 8)).toBe("07081804");
    expect(totpCode(seed, 1111111111, 8)).toBe("14050471");
    expect(totpCode(seed, 59)).toBe("287082");
  });
  it("accepts one step either side and nothing further", () => {
    const t = 1_700_000_000;
    expect(verifyTotp(seed, totpCode(seed, t), t)).toBe(true);
    expect(verifyTotp(seed, totpCode(seed, t - 30), t)).toBe(true);
    expect(verifyTotp(seed, totpCode(seed, t + 30), t)).toBe(true);
    expect(verifyTotp(seed, totpCode(seed, t - 90), t)).toBe(false);
    expect(verifyTotp(seed, "12345", t)).toBe(false);
  });
  it("base32 encodes per RFC 4648", () => {
    expect(base32Encode(new TextEncoder().encode("foobar")))
      .toBe("MZXW6YTBOI");
  });
});

describe("password (scrypt)", () => {
  const salt = new Uint8Array(16).fill(1);
  it("verifies the right password only", async () => {
    const stored = await hashPassword("correct horse battery", { N: 1024 },
      salt);
    expect(stored).toMatch(/^scrypt\$1024\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("wrong horse battery", stored)).toBe(false);
  });
  it("rejects a malformed stored value", async () => {
    expect(await verifyPassword("x", "plain")).toBe(false);
  });
});
