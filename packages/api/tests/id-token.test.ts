import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ISSUER_OK, verifyIdToken } from "../src/sso/id-token";
import {
  identityFromClaims,
  inviteEmailOk,
  jitEligible,
} from "../src/sso/identity";
import { fakeIssuer } from "./helpers/fake-oidc";

const iss = fakeIssuer();
const NOW = 1_800_000_000;
const TID = "11111111-1111-4111-8111-111111111111";
const base = { iss: "https://accounts.google.com", aud: "client",
  sub: "g-1", nonce: "n-1", exp: NOW + 600, iat: NOW };
const expect0 = { audience: "client", nonce: "n-1", nowSec: NOW,
  issuerOk: ISSUER_OK.google };
const check = (t: string, e = expect0) => {
  try {
    verifyIdToken(t, iss.jwks, e);
    return "ok";
  } catch (x) {
    return (x as { reason: string }).reason;
  }
};
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v))
  .toString("base64url");

describe("verifyIdToken", () => {
  it("id_token_valid_google", () => {
    expect(check(iss.idToken(base))).toBe("ok");
    expect(check(iss.idToken({ ...base, iss: "accounts.google.com" })))
      .toBe("ok");
    expect(check(iss.idToken({ ...base, exp: NOW - 119 }))).toBe("ok");
  });
  it("id_token_refusals", () => {
    const body = b64(base);
    expect(check(`${b64({ alg: "none", kid: "k1" })}.${body}.`))
      .toBe("ID_TOKEN_ALG");
    const pem = iss.publicKey.export({ type: "spki", format: "pem" });
    const hHead = b64({ alg: "HS256", kid: "k1" });
    const hs = createHmac("sha256", pem).update(`${hHead}.${body}`)
      .digest("base64url");
    expect(check(`${hHead}.${body}.${hs}`)).toBe("ID_TOKEN_ALG");
    expect(check(iss.idToken(base, { kid: "nope" }))).toBe("ID_TOKEN_KID");
    const [h, , s] = iss.idToken(base).split(".");
    expect(check(`${h}.${b64({ ...base, sub: "g-2" })}.${s}`))
      .toBe("ID_TOKEN_SIGNATURE");
    expect(check(iss.idToken({ ...base, aud: "other" })))
      .toBe("ID_TOKEN_AUDIENCE");
    expect(check(iss.idToken({ ...base, aud: ["client", "other"] })))
      .toBe("ID_TOKEN_AUDIENCE");
    expect(check(iss.idToken({ ...base, nonce: "x" }))).toBe("ID_TOKEN_NONCE");
    expect(check(iss.idToken({ ...base, exp: NOW - 121 })))
      .toBe("ID_TOKEN_EXPIRED");
    expect(check(iss.idToken({ ...base, iat: NOW + 121 })))
      .toBe("ID_TOKEN_NOT_YET");
  });
  it("id_token_microsoft_issuer", () => {
    const ms = { ...expect0, issuerOk: ISSUER_OK.microsoft };
    const t = { ...base, tid: TID,
      iss: `https://login.microsoftonline.com/${TID}/v2.0` };
    expect(check(iss.idToken(t), ms)).toBe("ok");
    expect(check(iss.idToken({ ...t, iss: "https://login.microsoftonline" +
      ".com/22222222-2222-4222-8222-222222222222/v2.0" }), ms))
      .toBe("ID_TOKEN_ISSUER");
    expect(check(iss.idToken({ ...t, tid: "not-a-uuid" }), ms))
      .toBe("ID_TOKEN_ISSUER");
  });
});

describe("sso link rules", () => {
  const OID = "33333333-3333-4333-8333-333333333333";
  const settings = { allowedDomains: ["acme.test"],
    googleHostedDomains: ["acme.test"], microsoftTenantIds: [TID],
    jitEmployees: true, enforceSso: false };
  const g = identityFromClaims("google", { sub: "g", email: "E@acme.test",
    email_verified: true, hd: "acme.test" });
  const ok = { identity: g, provider: "google" as const, settings,
    employeeMatch: true, userWithEmailExists: false };
  it("identities never take preferred_username or an unverified mail",
    () => {
      expect(identityFromClaims("microsoft", { tid: TID, oid: OID,
        preferred_username: "a@x.test" })).toMatchObject({ email: null,
        subjectKey: `${TID}:${OID}`, emailVerified: false });
      expect(identityFromClaims("google", { sub: "g", email: "a@x.test" })
        .emailVerified).toBe(false);
      expect(g.email).toBe("e@acme.test");
    });
  it("jitEligible needs every condition", () => {
    expect(jitEligible(ok)).toBe(true);
    const off = [{ ...ok, settings: { ...settings, jitEmployees: false } },
      { ...ok, settings: { ...settings, allowedDomains: [] } },
      { ...ok, identity: { ...g, emailVerified: false } },
      { ...ok, identity: { ...g, hostedDomain: "other.test" } },
      { ...ok, employeeMatch: false }, { ...ok, userWithEmailExists: true },
      { ...ok, identity: { ...g, email: null } }];
    for (const x of off) expect(jitEligible(x)).toBe(false);
  });
  it("inviteEmailOk for Microsoft needs a listed tenant", () => {
    const m = identityFromClaims("microsoft", { tid: TID, oid: OID,
      email: "h@acme.test" });
    expect(inviteEmailOk(m, "microsoft", "h@acme.test", settings))
      .toBe(true);
    expect(inviteEmailOk(m, "microsoft", "h@acme.test",
      { ...settings, microsoftTenantIds: [] })).toBe(false);
    expect(inviteEmailOk(g, "google", "x@acme.test", settings)).toBe(false);
  });
});
