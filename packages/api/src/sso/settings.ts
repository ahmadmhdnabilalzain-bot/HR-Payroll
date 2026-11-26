import {
  SSO_NOTE,
  SsoSettingsBody,
  type SsoSettings,
  type SsoSettingsUpdate,
} from "@payroll/contract";
import { channelAudit } from "../channels/audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { orgAccepted } from "./identity";

const DEFAULTS: SsoSettingsBody = { allowedDomains: [],
  googleHostedDomains: [], microsoftTenantIds: [], jitEmployees: false,
  enforceSso: false };

export async function ssoBody(tx: Db, companyId: string, lock = false) {
  const [r] = await tx.query<{ version: number; body: unknown }>(
    `SELECT version, body FROM sso_settings WHERE company_id = $1
     ${lock ? "FOR UPDATE" : ""}`, [companyId]);
  if (r === undefined) return { version: 0, body: DEFAULTS };
  const p = SsoSettingsBody.safeParse(r.body);
  return { version: r.version, body: p.success ? p.data : DEFAULTS };
}

export async function getSsoSettings(ctx: ReqCtx): Promise<SsoSettings> {
  const s = await ssoBody(ctx.tx, ctx.tenant!.companyId);
  const st = (on: boolean) => on ? "configured" : "not-configured";
  const o = ctx.deps.channels.oidc;
  return { ...s.body, version: s.version, note: SSO_NOTE,
    providers: { google: st(o.configured("google")),
      microsoft: st(o.configured("microsoft")) } };
}

export async function putSsoSettings(ctx: ReqCtx<SsoSettingsUpdate>)
  : Promise<SsoSettings> {
  const c = ctx.tenant!.companyId;
  const { expectedVersion, ...body } = ctx.body;
  const cur = await ssoBody(ctx.tx, c, true);
  if (cur.version !== expectedVersion) {
    throw new ApiError("SETTINGS_VERSION_CONFLICT");
  }
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO sso_settings (company_id, version, body, updated_by,
       updated_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id) DO UPDATE SET version = $2, body = $3,
       updated_by = $4, updated_at = $5`,
    [c, cur.version + 1, JSON.stringify(body), ctx.user!.id, at]);
  const keys = Object.keys(DEFAULTS) as (keyof SsoSettingsBody)[];
  await channelAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "sso.settings-updated", entityType: "company", entityId: c,
    data: { changed: keys.filter((k) => JSON.stringify(body[k]) !==
      JSON.stringify(cur.body[k])) } });
  return getSsoSettings(ctx);
}

/**
 * Tenant routes: with `enforceSso` on, anyone but an owner (owners keep
 * a break-glass password, Ruling 25) needs an SSO session from one of
 * the company's own hosted domains or tenants (review I3): a password
 * session, or one from a personal or foreign account, gets 403
 * SSO_REQUIRED. API key requests never reach this check.
 */
export async function checkSsoEnforced(tx: Db, companyId: string,
  role: string, session: { authMethod?: string; ssoOrg?: string | null })
  : Promise<void> {
  if (role === "owner") return;
  const s = (await ssoBody(tx, companyId)).body;
  if (!s.enforceSso) return;
  if (!orgAccepted(s, session.authMethod ?? "password", session.ssoOrg)) {
    throw new ApiError("SSO_REQUIRED");
  }
}

interface IdentityRow { id: string; provider: "google" | "microsoft";
  email: string | null; linked_at: string; last_used_at: string | null }

export async function listIdentities(ctx: ReqCtx) {
  const rows = await ctx.tx.query<IdentityRow>(
    `SELECT id, provider, email, linked_at, last_used_at FROM sso_identities
     WHERE user_id = $1 AND status = 'linked' ORDER BY linked_at, id`,
    [ctx.user!.id]);
  return { items: rows.map((r) => ({ id: r.id, provider: r.provider,
    email: r.email, linkedAt: r.linked_at, lastUsedAt: r.last_used_at })) };
}

/** Own identities only; the last way to sign in cannot be removed. */
export async function unlinkIdentity(ctx: ReqCtx<unknown, unknown,
  { id: string }>) {
  const me = ctx.user!;
  const mine = (await listIdentities(ctx)).items;
  if (!mine.some((i) => i.id === ctx.params.id)) {
    throw new ApiError("NOT_FOUND");
  }
  if (me.password_hash === null && mine.length <= 1) {
    throw new ApiError("LAST_SIGN_IN_METHOD");
  }
  await ctx.tx.query(
    `UPDATE sso_identities SET status = 'unlinked', unlinked_at = $3
     WHERE id = $1 AND user_id = $2`, [ctx.params.id, me.id,
      ctx.deps.now().toISOString()]);
  return listIdentities(ctx);
}
