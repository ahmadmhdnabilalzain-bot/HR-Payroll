import {
  CHANNEL_DEFAULTS,
  CHANNEL_DEFAULTS_NOTE,
  ChannelSettingsBody,
  type ChannelSettings,
  type ChannelSettingsUpdate,
  type ProviderStatus,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { channelAudit } from "./audit";
import type { ChannelPorts } from "./ports";

const state = (on: boolean) => on ? "configured" : "not-configured";

export function providerStatus(p: ChannelPorts): ProviderStatus {
  return { email: state(p.email.configured),
    whatsapp: state(p.whatsapp.configured),
    inboundEmail: state(p.inboundEmail.configured),
    googleSso: state(p.oidc.configured("google")),
    microsoftSso: state(p.oidc.configured("microsoft")) };
}

/** The stored body and version; defaults (version 0) when none. */
export async function settingsBody(tx: Db, companyId: string, lock = false)
  : Promise<{ version: number; body: ChannelSettingsBody }> {
  const [r] = await tx.query<{ version: number; body: unknown }>(
    `SELECT version, body FROM channel_settings WHERE company_id = $1
     ${lock ? "FOR UPDATE" : ""}`, [companyId]);
  if (r === undefined) return { version: 0, body: CHANNEL_DEFAULTS };
  return { version: r.version, body: ChannelSettingsBody.parse(r.body) };
}

export async function getChannelSettings(tx: Db, deps: HandlerDeps,
  companyId: string): Promise<ChannelSettings> {
  const s = await settingsBody(tx, companyId);
  return { ...s.body, version: s.version,
    providers: providerStatus(deps.channels),
    note: CHANNEL_DEFAULTS_NOTE };
}

const KEYS = Object.keys(CHANNEL_DEFAULTS) as (keyof ChannelSettingsBody)[];

/** Owner with MFA (route); optimistic version; WhatsApp needs a sender. */
export async function putChannelSettings(ctx: ReqCtx<ChannelSettingsUpdate>)
  : Promise<ChannelSettings> {
  const c = ctx.tenant!.companyId;
  const { expectedVersion, ...body } = ctx.body;
  const cur = await settingsBody(ctx.tx, c, true);
  if (cur.version !== expectedVersion) {
    throw new ApiError("SETTINGS_VERSION_CONFLICT");
  }
  if (body.whatsappEnabled && !ctx.deps.channels.whatsapp.configured) {
    throw new ApiError("CHANNEL_NOT_CONFIGURED");
  }
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO channel_settings (company_id, version, body, updated_by,
       updated_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id) DO UPDATE SET version = $2, body = $3,
       updated_by = $4, updated_at = $5`,
    [c, cur.version + 1, JSON.stringify(body), ctx.user!.id, at]);
  await channelAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "channel.settings-updated", entityType: "company",
    entityId: c, data: { changed: KEYS.filter((k) =>
      body[k] !== cur.body[k]) } });
  return getChannelSettings(ctx.tx, ctx.deps, c);
}
