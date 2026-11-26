import { createHmac, timingSafeEqual } from "node:crypto";

/** Hours a WhatsApp action stays valid (product default). */
export const ACTION_TTL_HOURS = 48;

export type Decision = "a" | "r";

export interface ActionClaims {
  companyId: string;
  actionId: string;
  decision: Decision;
}

const U = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const TOKEN = new RegExp(
  `^wa1\\.(${U})\\.(${U})\\.([ar])\\.([1-9][0-9]{0,11})\\.` +
  "([A-Za-z0-9_-]{43})$");

function mac(key: Uint8Array, c: ActionClaims, expiresAt: number): Buffer {
  return createHmac("sha256", key).update(
    `wa1\n${c.companyId}\n${c.actionId}\n${c.decision}\n${expiresAt}`,
    "utf8").digest();
}

/**
 * Pure: a signed one-time action token (`wa1.<company>.<action>.<a|r>.
 * <expiry>.<HMAC>`), at most 200 characters. The key is
 * `keyring.derive("payroll/wa-action/v1")`.
 */
export function signAction(key: Uint8Array, a: ActionClaims &
  { expiresAt: number }): string {
  const sig = mac(key, a, a.expiresAt).toString("base64url");
  return `wa1.${a.companyId}.${a.actionId}.${a.decision}.${a.expiresAt}.` +
    sig;
}

/**
 * Pure: the token's claims, or why not. The signature is compared in
 * constant time, and the expiry is read only after it verifies.
 */
export function verifyAction(key: Uint8Array, token: string, nowSec: number)
  : ActionClaims | "malformed" | "bad-signature" | "expired" {
  if (token.length > 200) return "malformed";
  const m = TOKEN.exec(token);
  if (m === null) return "malformed";
  const claims: ActionClaims = { companyId: m[1]!, actionId: m[2]!,
    decision: m[3] as Decision };
  const expiresAt = Number(m[4]);
  // Compare the canonical text: base64url's spare bits cannot vary.
  const want = Buffer.from(mac(key, claims, expiresAt)
    .toString("base64url"));
  const got = Buffer.from(m[5]!);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return "bad-signature";
  }
  return nowSec > expiresAt ? "expired" : claims;
}
