import { scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const R = 8;
const P = 1;
const KEY_LEN = 32;

function derive(pw: string, salt: Buffer, N: number): Promise<Buffer> {
  const opts: ScryptOptions = { N, r: R, p: P, maxmem: 256 * N * R };
  return new Promise((resolve, reject) => {
    scrypt(pw.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) =>
      err ? reject(err) : resolve(key));
  });
}

/** `scrypt$N$r$p$salt$hash` (base64url). The salt is passed in. */
export async function hashPassword(
  pw: string,
  cost: { N: number },
  salt: Uint8Array,
): Promise<string> {
  const s = Buffer.from(salt);
  const key = await derive(pw, s, cost.N);
  return ["scrypt", cost.N, R, P, s.toString("base64url"),
    key.toString("base64url")].join("$");
}

/** Constant-time check; false for any malformed stored value. */
export async function verifyPassword(
  pw: string,
  stored: string,
): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || r !== String(R) || p !== String(P)) return false;
  if (salt === undefined || hash === undefined) return false;
  const N = Number(n);
  if (!Number.isSafeInteger(N) || N < 2) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(pw, Buffer.from(salt, "base64url"), N);
  return key.length === expected.length && timingSafeEqual(key, expected);
}
