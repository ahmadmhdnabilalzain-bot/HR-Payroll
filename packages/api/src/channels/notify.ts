import {
  TEMPLATES,
  type ChannelSettingsBody,
  type DeliverySkipReason,
  type NotificationKind,
  type NotificationPrefs,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { ReqCtx } from "../http/context";
import { channelSealer } from "./crypto";
import { getPrefs } from "./prefs";
import { quietUntil } from "./quiet";
import { renderTemplate, whatsappParams, type Rendered } from "./render";
import { settingsBody } from "./settings";

/** What emitting needs: a tenant transaction and the deps. */
export interface EventCtx {
  tx: Db;
  deps: HandlerDeps;
  companyId: string;
}

export const eventCtx = (ctx: ReqCtx): EventCtx =>
  ({ tx: ctx.tx, deps: ctx.deps, companyId: ctx.tenant!.companyId });

export interface Recipient {
  userId: string;
  kind: NotificationKind;
  vars: Record<string, string>;
  link: { routeId: string; id: string | null } | null;
}

/** Security notices and codes are never held for quiet hours. */
const NEVER_HELD: readonly NotificationKind[] = ["security-sso-linked",
  "channel-verify-code"];

interface Plan {
  channel: "email" | "whatsapp";
  skip: DeliverySkipReason | null;
}

function emailPlan(k: NotificationKind, p: NotificationPrefs,
  s: ChannelSettingsBody): Plan {
  const pref = k === "channel-verify-code" ? false : p.kinds[k].email;
  return { channel: "email", skip: !s.emailEnabled ? "company-disabled"
    : !pref ? "channel-off" : null };
}

function whatsappPlan(k: NotificationKind, p: NotificationPrefs,
  s: ChannelSettingsBody): Plan {
  if (k === "channel-verify-code") return { channel: "whatsapp", skip: null };
  const pref = p.kinds[k].whatsapp && TEMPLATES[k].whatsappTemplate !== null;
  return { channel: "whatsapp", skip: !s.whatsappEnabled
    ? "company-disabled" : !pref ? "channel-off" : null };
}

async function insertNotice(c: EventCtx, r: Recipient, m: Rendered)
  : Promise<string> {
  const id = c.deps.newId();
  await c.tx.query(
    `INSERT INTO notifications (id, company_id, user_id, kind, title, body,
       link, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, c.companyId, r.userId, r.kind, m.subject, m.body,
      r.link === null ? null : JSON.stringify(r.link),
      c.deps.now().toISOString()]);
  return id;
}

interface DeliveryInput {
  r: Recipient;
  plan: Plan;
  noticeId: string | null;
  payload: string;
  heldUntil: Date | null;
  fallback: boolean;
}

/** One outbox row; the rendered message is sealed. */
export async function insertDelivery(c: EventCtx, d: DeliveryInput,
  fallbackOf: string | null = null): Promise<string> {
  const id = c.deps.newId();
  const sealer = await channelSealer(c.tx, c.deps, c.companyId);
  const status = d.plan.skip !== null ? "skipped"
    : d.heldUntil !== null ? "held" : "queued";
  await c.tx.query(
    `INSERT INTO notification_deliveries (id, company_id, notification_id,
       user_id, channel, kind, status, reason, not_before,
       language_fallback, payload_enc, fallback_of, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [id, c.companyId, d.noticeId, d.r.userId, d.plan.channel, d.r.kind,
      status, d.plan.skip, d.heldUntil?.toISOString() ?? null, d.fallback,
      sealer.seal("notification_deliveries", "payload", id, d.payload),
      fallbackOf, c.deps.now().toISOString()]);
  return id;
}

function payloadOf(r: Recipient, m: Rendered, lang: "en" | "ar"): string {
  const t = TEMPLATES[r.kind];
  return JSON.stringify({ subject: m.subject, text: m.body,
    language: m.language, templateName: t.whatsappTemplate,
    params: t.whatsappTemplate === null ? []
      : whatsappParams(r.kind, lang, r.vars), vars: r.vars });
}

/**
 * The in-app notice (none for verify codes) and one outbox row per
 * external channel, in the caller's transaction. No audit row.
 */
export async function notify(c: EventCtx, r: Recipient): Promise<string> {
  const prefs = await getPrefs(c.tx, c.companyId, r.userId);
  const settings = (await settingsBody(c.tx, c.companyId)).body;
  const m = renderTemplate(r.kind, prefs.language, r.vars);
  const verify = r.kind === "channel-verify-code";
  const noticeId = verify ? null : await insertNotice(c, r, m);
  const heldUntil = NEVER_HELD.includes(r.kind) ? null
    : quietUntil(c.deps.now(), prefs.quietHours);
  const base = { r, noticeId, payload: payloadOf(r, m, prefs.language),
    heldUntil, fallback: m.languageFallback };
  const plans = verify ? [whatsappPlan(r.kind, prefs, settings)]
    : [emailPlan(r.kind, prefs, settings),
      whatsappPlan(r.kind, prefs, settings)];
  const ids: string[] = [];
  for (const plan of plans) ids.push(await insertDelivery(c, { ...base,
    plan }));
  return noticeId ?? ids[0]!;
}
