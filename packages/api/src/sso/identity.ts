import { createHash } from "node:crypto";
import type { SsoSettingsBody } from "@payroll/contract";
import type { SsoProvider } from "../channels/ports";
import { IdTokenError } from "./id-token";

/** Pure: an S256 PKCE pair from 32 random bytes. */
export function pkcePair(random32: Uint8Array)
  : { verifier: string; challenge: string } {
  const verifier = Buffer.from(random32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier)
    .digest("base64url") };
}

export interface Identity {
  subjectKey: string;
  email: string | null;
  emailVerified: boolean;
  hostedDomain: string | null;
  tenantId: string | null;
  displayName: string;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (v: unknown) => typeof v === "string" && v !== "" ? v : null;

/**
 * Pure. Keyed by Google `sub` or Microsoft `tid:oid`, never by email.
 * A Microsoft email is never treated as verified, and
 * `preferred_username` is never used (Ruling 22).
 */
export function identityFromClaims(p: SsoProvider,
  c: Record<string, unknown>): Identity {
  const email = str(c.email)?.toLowerCase() ?? null;
  const name = str(c.name)?.slice(0, 80) ?? email?.split("@")[0] ?? "User";
  if (p === "google") {
    const sub = str(c.sub);
    if (sub === null) throw new IdTokenError("ID_TOKEN_CLAIMS");
    return { subjectKey: sub, email, emailVerified: c.email_verified === true,
      hostedDomain: str(c.hd)?.toLowerCase() ?? null, tenantId: null,
      displayName: name };
  }
  const tid = str(c.tid);
  const oid = str(c.oid);
  if (tid === null || oid === null || !UUID.test(oid) || !UUID.test(tid)) {
    throw new IdTokenError("ID_TOKEN_CLAIMS");
  }
  return { subjectKey: `${tid}:${oid}`, email, emailVerified: false,
    hostedDomain: null, tenantId: tid, displayName: name };
}

/** The organisation an identity proves: Google `hd` or Entra `tid`. */
export const orgOf = (id: Identity): string | null =>
  id.hostedDomain !== null ? `hd:${id.hostedDomain}`
    : id.tenantId !== null ? `tid:${id.tenantId}` : null;

/**
 * Pure (review I3): does an SSO session from `org` satisfy a company
 * that enforces SSO? Only its own hosted domains or tenants count.
 */
export function orgAccepted(s: SsoSettingsBody, provider: string,
  org: string | null | undefined): boolean {
  if (org === null || org === undefined) return false;
  if (provider === "sso:google" && org.startsWith("hd:")) {
    return s.googleHostedDomains.includes(org.slice(3));
  }
  if (provider === "sso:microsoft" && org.startsWith("tid:")) {
    return s.microsoftTenantIds.includes(org.slice(4));
  }
  return false;
}

const domainOf = (email: string) => email.slice(email.lastIndexOf("@") + 1);

/** Pure: the one case where sign-in may create an account (Ruling 23). */
export function jitEligible(i: { identity: Identity; provider: SsoProvider;
  settings: SsoSettingsBody; employeeMatch: boolean;
  userWithEmailExists: boolean }): boolean {
  const { identity: id, settings: s } = i;
  if (!s.jitEmployees || id.email === null) return false;
  if (!s.allowedDomains.includes(domainOf(id.email))) return false;
  const org = i.provider === "google"
    ? id.emailVerified && id.hostedDomain !== null &&
      s.googleHostedDomains.includes(id.hostedDomain)
    : id.tenantId !== null && s.microsoftTenantIds.includes(id.tenantId);
  return org && i.employeeMatch && !i.userWithEmailExists;
}

/** Pure: may this identity accept an invitation sent to `inviteEmail`? */
export function inviteEmailOk(id: Identity, provider: SsoProvider,
  inviteEmail: string, settings: SsoSettingsBody): boolean {
  if (id.email === null || id.email !== inviteEmail.toLowerCase()) {
    return false;
  }
  return provider === "google" ? id.emailVerified
    : id.tenantId !== null && settings.microsoftTenantIds
      .includes(id.tenantId);
}
