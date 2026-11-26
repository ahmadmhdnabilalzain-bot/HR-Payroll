import type { SsoDomainRequest, SsoSettingsBody } from "@payroll/contract";
import { channelAudit } from "../channels/audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

/**
 * Review I4: domain ownership by DNS TXT. A company adds a domain and
 * gets a challenge; once `_hr-payroll-challenge.<domain>` holds
 * `hr-payroll-verify=<token>` it may verify it. Only verified domains
 * count for just-in-time accounts and enforcement, and one company
 * at most holds a verified domain.
 */
interface DomainRow { domain: string; token: string;
  status: "pending" | "verified"; verified_at: string | null }

export const txtName = (d: string) => `_hr-payroll-challenge.${d}`;
const txtValue = (token: string) => `hr-payroll-verify=${token}`;

async function rows(tx: Db, c: string): Promise<DomainRow[]> {
  return tx.query<DomainRow>(
    `SELECT domain, token, status, verified_at FROM sso_domains
     WHERE company_id = $1 ORDER BY domain`, [c]);
}

export async function domainViews(tx: Db, c: string) {
  return (await rows(tx, c)).map((r) => ({ domain: r.domain,
    status: r.status, txtName: txtName(r.domain),
    txtValue: txtValue(r.token), verifiedAt: r.verified_at }));
}

export async function verifiedDomains(tx: Db, c: string)
  : Promise<string[]> {
  return (await rows(tx, c)).filter((r) => r.status === "verified")
    .map((r) => r.domain);
}

/** The settings as JIT and enforcement may use them: verified only. */
export function effective(s: SsoSettingsBody, verified: string[])
  : SsoSettingsBody {
  return { ...s,
    allowedDomains: s.allowedDomains.filter((d) => verified.includes(d)),
    googleHostedDomains: s.googleHostedDomains.filter((d) =>
      verified.includes(d)) };
}

async function taken(tx: Db, domain: string, c: string): Promise<boolean> {
  const [r] = await tx.query<{ taken: boolean }>(
    "SELECT sso_domain_taken($1, $2) AS taken", [domain, c]);
  return r?.taken === true;
}

/** POST /v1/sso-settings/domains: a pending domain with its challenge. */
export async function addDomain(ctx: ReqCtx<SsoDomainRequest>)
  : Promise<void> {
  const c = ctx.tenant!.companyId;
  const d = ctx.body.domain;
  if (await taken(ctx.tx, d, c)) throw new ApiError("SSO_DOMAIN_CLAIMED");
  await ctx.tx.query(
    `INSERT INTO sso_domains (company_id, domain, token, status,
       created_at) VALUES ($1, $2, $3, 'pending', $4)
     ON CONFLICT (company_id, domain) DO NOTHING`,
    [c, d, Buffer.from(ctx.deps.randomBytes(18)).toString("base64url"),
      ctx.deps.now().toISOString()]);
}

/** POST /v1/sso-settings/domains/verify: checks the TXT record. */
export async function verifyDomain(ctx: ReqCtx<SsoDomainRequest>)
  : Promise<void> {
  const c = ctx.tenant!.companyId;
  const d = ctx.body.domain;
  const [r] = await ctx.tx.query<DomainRow>(
    `SELECT domain, token, status, verified_at FROM sso_domains
     WHERE company_id = $1 AND domain = $2 FOR UPDATE`, [c, d]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  if (r.status === "verified") return;
  if (await taken(ctx.tx, d, c)) throw new ApiError("SSO_DOMAIN_CLAIMED");
  const txt = await ctx.deps.channels.resolveTxt(txtName(d));
  if (!txt.includes(txtValue(r.token))) {
    throw new ApiError("SSO_DOMAIN_NOT_VERIFIED");
  }
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `UPDATE sso_domains SET status = 'verified', verified_at = $3
     WHERE company_id = $1 AND domain = $2`, [c, d, at]);
  await channelAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "sso.domain-verified", entityType: "company", entityId: c,
    data: {} });
}
