import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { keyringFromKey } from "../src/crypto/keyring";

const rand = (n: number) => new Uint8Array(randomBytes(n));
const ring = keyringFromKey(new Uint8Array(32).fill(3), rand);
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const keyA = ring.companyKey(ring.wrapNewDek(A).dekWrapped, A);
const keyB = ring.companyKey(ring.wrapNewDek(B).dekWrapped, B);
const aad = (c: string, id: string) => `${c}:files:blob:${id}`;

describe("company key byte encryption", () => {
  it("round-trips 1 MiB and starts with the version byte", () => {
    const plain = rand(1024 * 1024);
    const c = keyA.encryptBytes(aad(A, "f1"), plain);
    expect(c[0]).toBe(0x01);
    expect(c.length).toBe(1 + 12 + 16 + plain.length);
    expect(keyA.decryptBytes(aad(A, "f1"), c)).toEqual(plain);
  });
  it("a wrong AAD or another company's key throws", () => {
    const c = keyA.encryptBytes(aad(A, "f1"), rand(64));
    expect(() => keyA.decryptBytes(aad(A, "f2"), c)).toThrow();
    expect(() => keyB.decryptBytes(aad(A, "f1"), c)).toThrow();
    expect(() => keyB.decryptBytes(aad(B, "f1"), c)).toThrow();
  });
  it("refuses an AAD of another company and a short or bad cipher", () => {
    expect(() => keyA.encryptBytes(aad(B, "f1"), rand(4))).toThrow();
    const c = keyA.encryptBytes(aad(A, "f1"), rand(64));
    expect(() => keyA.decryptBytes(aad(A, "f1"), c.subarray(0, 20)))
      .toThrow();
    const bad = new Uint8Array(c);
    bad[0] = 0x02;
    expect(() => keyA.decryptBytes(aad(A, "f1"), bad)).toThrow();
    const flipped = new Uint8Array(c);
    flipped[flipped.length - 1]! ^= 1;
    expect(() => keyA.decryptBytes(aad(A, "f1"), flipped)).toThrow();
  });
  it("two encryptions of the same bytes differ", () => {
    const p = rand(32);
    const x = keyA.encryptBytes(aad(A, "f1"), p);
    const y = keyA.encryptBytes(aad(A, "f1"), p);
    expect(Buffer.from(x).equals(Buffer.from(y))).toBe(false);
  });
});
