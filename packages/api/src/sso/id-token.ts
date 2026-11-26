import { createPublicKey, verify } from "node:crypto";

export type IdTokenReason = "ID_TOKEN_FORMAT" | "ID_TOKEN_ALG" |
  "ID_TOKEN_KID" | "ID_TOKEN_SIGNATURE" | "ID_TOKEN_ISSUER" |
  "ID_TOKEN_AUDIENCE" | "ID_TOKEN_EXPIRED" | "ID_TOKEN_NOT_YET" |
  "ID_TOKEN_NONCE" | "ID_TOKEN_CLAIMS";

export class IdTokenError extends Error {
  constructor(readonly reason: IdTokenReason) {
    super(reason);
    this.name = "IdTokenError";
  }
}

export interface IdTokenExpect {
  audience: string;
  nonce: string;
  nowSec: number;
  issuerOk: (iss: string, claims: Record<string, unknown>) => boolean;
}

/** Clock skew allowed either way. */
const SKEW = 120;
const B64URL = /^[A-Za-z0-9_-]+$/;

function part(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw 0;
    return v as Record<string, unknown>;
  } catch {
    throw new IdTokenError("ID_TOKEN_FORMAT");
  }
}

function checkSignature(h: Record<string, unknown>, signed: string,
  sig: string, keys: JsonWebKey[]): void {
  if (h.alg !== "RS256") throw new IdTokenError("ID_TOKEN_ALG");
  const jwk = typeof h.kid === "string" ? keys.find((k) =>
    (k as { kid?: unknown }).kid === h.kid && k.kty === "RSA") : undefined;
  if (jwk === undefined) throw new IdTokenError("ID_TOKEN_KID");
  const key = createPublicKey({ key: jwk as never, format: "jwk" });
  const ok = verify("sha256", Buffer.from(signed), key,
    Buffer.from(sig, "base64url"));
  if (!ok) throw new IdTokenError("ID_TOKEN_SIGNATURE");
}

function checkAudience(c: Record<string, unknown>, clientId: string) {
  const aud = c.aud;
  const list = Array.isArray(aud) ? aud : [aud];
  const ok = list.includes(clientId) &&
    (list.length === 1 || c.azp === clientId);
  if (!ok) throw new IdTokenError("ID_TOKEN_AUDIENCE");
}

function checkTimes(c: Record<string, unknown>, now: number): void {
  if (typeof c.exp !== "number" || c.exp <= now - SKEW) {
    throw new IdTokenError("ID_TOKEN_EXPIRED");
  }
  for (const k of ["iat", "nbf"]) {
    const v = c[k];
    if (v !== undefined && (typeof v !== "number" || v > now + SKEW)) {
      throw new IdTokenError("ID_TOKEN_NOT_YET");
    }
  }
}

/**
 * Verifies an OIDC ID token: RS256 only, a known RSA key by kid, the
 * signature, issuer, audience (and azp for several), times with 120 s
 * skew, and the nonce. Returns the claims or throws IdTokenError.
 */
export function verifyIdToken(jwt: string, keys: JsonWebKey[],
  e: IdTokenExpect): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3 || jwt.length > 16_384 ||
    !parts.every((p, i) => i === 2 ? B64URL.test(p) || p === ""
      : B64URL.test(p))) throw new IdTokenError("ID_TOKEN_FORMAT");
  const [h, p, s] = parts as [string, string, string];
  const header = part(h);
  const claims = part(p);
  checkSignature(header, `${h}.${p}`, s, keys);
  if (typeof claims.iss !== "string" || !e.issuerOk(claims.iss, claims)) {
    throw new IdTokenError("ID_TOKEN_ISSUER");
  }
  checkAudience(claims, e.audience);
  checkTimes(claims, e.nowSec);
  if (claims.nonce !== e.nonce) throw new IdTokenError("ID_TOKEN_NONCE");
  return claims;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// UNVERIFIED: issuer formats from general knowledge; the research
// EXCERPT says to validate the issuer and the tenant id.
type IssuerOk = (iss: string, c: Record<string, unknown>) => boolean;

export const ISSUER_OK: Record<"google" | "microsoft", IssuerOk> = {
  google: (iss: string): boolean => iss === "https://accounts.google.com" ||
    iss === "accounts.google.com",
  microsoft: (iss: string, c: Record<string, unknown>) =>
    typeof c.tid === "string" && UUID.test(c.tid) &&
    iss === `https://login.microsoftonline.com/${c.tid}/v2.0`,
};
