import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import type { OidcClient, SsoProvider } from "../../src/channels/ports";
import { ApiError } from "../../src/http/errors";

const b64 = (v: unknown) =>
  Buffer.from(JSON.stringify(v)).toString("base64url");

export interface FakeIssuer {
  jwks: JsonWebKey[];
  publicKey: KeyObject;
  idToken(claims: Record<string, unknown>, o?: { kid?: string;
    alg?: string }): string;
}

/** An RSA key pair, its JWKS and an RS256 ID token signer (tests). */
export function fakeIssuer(): FakeIssuer {
  const { publicKey, privateKey } = generateKeyPairSync("rsa",
    { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1",
    alg: "RS256", use: "sig" } as JsonWebKey;
  return { jwks: [jwk], publicKey, idToken(claims, o = {}) {
    const head = b64({ alg: o.alg ?? "RS256", kid: o.kid ?? "k1",
      typ: "JWT" });
    const body = b64(claims);
    const sig = sign("sha256", Buffer.from(`${head}.${body}`), privateKey)
      .toString("base64url");
    return `${head}.${body}.${sig}`;
  } };
}

export interface FakeOidc extends OidcClient {
  issuer: FakeIssuer;
  /** code -> ID token the token endpoint returns. */
  codes: Map<string, string>;
  /** Every authorize call (state and nonce as sent to the provider). */
  starts: { provider: SsoProvider; state: string; nonce: string }[];
}

export function fakeOidc(): FakeOidc {
  const issuer = fakeIssuer();
  const codes = new Map<string, string>();
  const starts: FakeOidc["starts"] = [];
  return { issuer, codes, starts,
    configured: () => true,
    clientId: (p) => `client-${p}`,
    authorizeUrl(p, a) {
      starts.push({ provider: p, state: a.state, nonce: a.nonce });
      return `https://idp.test/${p}/authorize?state=${a.state}`;
    },
    async exchangeCode(_p, a) {
      const t = codes.get(a.code);
      if (t === undefined) throw new ApiError("SSO_FAILED");
      return { idToken: t };
    },
    keys: async () => issuer.jwks };
}
