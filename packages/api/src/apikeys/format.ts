import { createHash } from "node:crypto";

const KEY = /^hrk_([0-9a-f]{16})_([A-Za-z0-9_-]{43})$/;

/** Pure: `hrk_<key id>_<base64url of 32 bytes>`. */
export function formatApiKey(keyId: string, secret: Uint8Array): string {
  return `hrk_${keyId}_${Buffer.from(secret).toString("base64url")}`;
}

/** Pure: the key id and secret text, or null. */
export function parseApiKey(s: string)
  : { keyId: string; secret: string } | null {
  const m = KEY.exec(s);
  return m === null ? null : { keyId: m[1]!, secret: m[2]! };
}

/** SHA-256 hex of the secret text (256 bits: no slow hash needed). */
export function hashKeySecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
