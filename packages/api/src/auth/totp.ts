import { createHmac, timingSafeEqual } from "node:crypto";

const STEP = 30;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 6238 TOTP with HMAC-SHA1 and a 30-second step. */
export function totpCode(
  secret: Uint8Array,
  unixSeconds: number,
  digits = 6,
): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(unixSeconds / STEP)));
  const mac = createHmac("sha1", secret).update(counter).digest();
  const offset = (mac[mac.length - 1] ?? 0) & 0x0f;
  const bin = mac.readUInt32BE(offset) & 0x7fffffff;
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

function sameCode(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Accepts the codes of the previous, current and next step. */
export function verifyTotp(
  secret: Uint8Array,
  code: string,
  unixSeconds: number,
): boolean {
  return totpStep(secret, code, unixSeconds) !== null;
}

/**
 * The step (unix seconds / 30) whose code matches, trying the
 * previous, current and next step; null when none does. Callers keep
 * the last accepted step so a code works once.
 */
export function totpStep(
  secret: Uint8Array,
  code: string,
  unixSeconds: number,
): number | null {
  let found: number | null = null;
  for (const d of [-1, 0, 1]) {
    const t = unixSeconds + d * STEP;
    if (sameCode(totpCode(secret, t), code)) found = Math.floor(t / STEP);
  }
  return found;
}

/** RFC 4648 base32 without padding (authenticator apps expect this). */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of text.replace(/=+$/, "").toUpperCase()) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error("not base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
