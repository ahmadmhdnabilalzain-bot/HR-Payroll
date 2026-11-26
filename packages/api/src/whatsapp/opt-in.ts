import {
  WHATSAPP_CONSENT_VERSION,
  type MyChannels,
  type WhatsAppOptInStart,
  type WhatsAppVerify,
} from "@payroll/contract";
import { sha256Hex } from "../audit/canonical";
import { channelAudit } from "../channels/audit";
import { channelSealer } from "../channels/crypto";
import { skipDelivery, type DeliveryRowDb } from "../channels/fallback";
import { eventCtx, notify } from "../channels/notify";
import { consumeRate } from "../channels/rate";
import { settingsBody } from "../channels/settings";
import { Refuse, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { phoneHash } from "./phone";
import { myChannels } from "./my-channels";

const CODE_MS = 10 * 60_000;
const MAX_TRIES = 5;

/** 6 digits, unbiased: 32-bit draws at or above 4,294,000,000 redrawn. */
export function sixDigits(random: (n: number) => Uint8Array): string {
  for (;;) {
    const v = Buffer.from(random(4)).readUInt32BE(0);
    if (v < 4_294_000_000) return String(v % 1_000_000).padStart(6, "0");
  }
}

const codeHash = (optInId: string, code: string) =>
  sha256Hex(`${optInId}:${code}`);

async function checkAllowed(ctx: ReqCtx): Promise<void> {
  const c = ctx.tenant!.companyId;
  if (!ctx.deps.channels.whatsapp.configured) {
    throw new ApiError("CHANNEL_NOT_CONFIGURED");
  }
  if (!(await settingsBody(ctx.tx, c)).body.whatsappEnabled) {
    throw new ApiError("CHANNEL_DISABLED");
  }
  const r = await consumeRate(ctx.tx, c, "wa-optin", ctx.user!.id, 5,
    86400, ctx.deps.now());
  if (!r.allowed) throw new ApiError("RATE_LIMITED");
}

/** The person's own act: consent, then a code to their WhatsApp. */
export async function startOptIn(ctx: ReqCtx<WhatsAppOptInStart>)
  : Promise<MyChannels> {
  await checkAllowed(ctx);
  const c = ctx.tenant!.companyId;
  const now = ctx.deps.now();
  await ctx.tx.query(
    `UPDATE channel_opt_ins SET status = 'withdrawn', withdrawn_at = $3,
       withdrawn_via = 'replaced' WHERE company_id = $1 AND user_id = $2
       AND status <> 'withdrawn'`, [c, ctx.user!.id, now.toISOString()]);
  const id = ctx.deps.newId();
  const s = await channelSealer(ctx.tx, ctx.deps, c);
  const phone = ctx.body.phone;
  await ctx.tx.query(
    `INSERT INTO channel_opt_ins (id, company_id, user_id, channel,
       phone_enc, phone_hash, phone_last4, status, consent_version,
       created_at) VALUES ($1, $2, $3, 'whatsapp', $4, $5, $6, 'pending',
       $7, $8)`, [id, c, ctx.user!.id, s.seal("channel_opt_ins", "phone", id,
      phone), phoneHash(ctx.deps.keyring, phone), phone.slice(-4),
    WHATSAPP_CONSENT_VERSION, now.toISOString()]);
  const code = sixDigits(ctx.deps.randomBytes);
  await ctx.tx.query(
    `INSERT INTO channel_verify_codes (company_id, opt_in_id, code_hash,
       expires_at) VALUES ($1, $2, $3, $4)`, [c, id, codeHash(id, code),
      new Date(now.getTime() + CODE_MS).toISOString()]);
  await notify(eventCtx(ctx), { userId: ctx.user!.id,
    kind: "channel-verify-code", vars: { code }, link: null });
  return myChannels(ctx);
}

interface Pending { id: string; code_hash: string; expires_at: string;
  attempts: number }

/** Wrong codes count (committed); the fifth wrong one withdraws. */
export async function verifyOptIn(ctx: ReqCtx<WhatsAppVerify>)
  : Promise<MyChannels | Refuse> {
  const c = ctx.tenant!.companyId;
  const now = ctx.deps.now();
  const [p] = await ctx.tx.query<Pending>(
    `SELECT o.id, v.code_hash, v.expires_at, v.attempts
     FROM channel_opt_ins o JOIN channel_verify_codes v
       ON v.company_id = o.company_id AND v.opt_in_id = o.id
     WHERE o.company_id = $1 AND o.user_id = $2 AND o.status = 'pending'
       AND v.used_at IS NULL FOR UPDATE OF o, v`, [c, ctx.user!.id]);
  if (p === undefined) throw new ApiError("OPT_IN_NOT_PENDING");
  if (new Date(p.expires_at) <= now) throw new ApiError("VERIFY_CODE_EXPIRED");
  if (codeHash(p.id, ctx.body.code) !== p.code_hash) {
    return wrongCode(ctx, p);
  }
  await ctx.tx.query(
    `UPDATE channel_opt_ins SET status = 'active', verified_at = $3,
       consented_at = $3 WHERE company_id = $1 AND id = $2`,
    [c, p.id, now.toISOString()]);
  await ctx.tx.query("UPDATE channel_verify_codes SET used_at = $3 " +
    "WHERE company_id = $1 AND opt_in_id = $2", [c, p.id,
    now.toISOString()]);
  await channelAudit(ctx.tx, { companyId: c, at: now.toISOString(),
    actorUserId: ctx.user!.id, action: "whatsapp.opted-in",
    entityType: "channel-opt-in", entityId: p.id,
    data: { consentVersion: WHATSAPP_CONSENT_VERSION } });
  await replaceOthers(ctx, p.id);
  return myChannels(ctx);
}

/**
 * Security review I2: the verified number now belongs to this user.
 * Everyone else's opt-in on it ends in every company and their open
 * actions are voided; withdrawals in this company are audited (other
 * companies keep `withdrawn_via = 'replaced'` on the row: their audit
 * chains cannot be written from this tenant).
 */
async function replaceOthers(ctx: ReqCtx, optInId: string): Promise<void> {
  const c = ctx.tenant!.companyId;
  const at = ctx.deps.now().toISOString();
  const [h] = await ctx.tx.query<{ phone_hash: string }>(
    "SELECT phone_hash FROM channel_opt_ins WHERE company_id = $1 " +
    "AND id = $2", [c, optInId]);
  const gone = await ctx.tx.query<{ company_id: string; opt_in_id: string }>(
    "SELECT * FROM replace_whatsapp_phone($1, $2, $3)",
    [h!.phone_hash, ctx.user!.id, at]);
  for (const r of gone.filter((x) => x.company_id === c)) {
    await channelAudit(ctx.tx, { companyId: c, at, actorUserId:
      ctx.user!.id, action: "whatsapp.opted-out",
    entityType: "channel-opt-in", entityId: r.opt_in_id,
    data: { via: "replaced" } });
  }
}

async function wrongCode(ctx: ReqCtx, p: Pending): Promise<Refuse> {
  const c = ctx.tenant!.companyId;
  await ctx.tx.query("UPDATE channel_verify_codes SET attempts = " +
    "attempts + 1 WHERE company_id = $1 AND opt_in_id = $2", [c, p.id]);
  if (p.attempts + 1 >= MAX_TRIES) {
    await ctx.tx.query(
      `UPDATE channel_opt_ins SET status = 'withdrawn', withdrawn_at = $3,
         withdrawn_via = 'app' WHERE company_id = $1 AND id = $2`,
      [c, p.id, ctx.deps.now().toISOString()]);
  }
  return new Refuse(new ApiError("VERIFY_CODE_INVALID"));
}

/** One tap: no more WhatsApp; waiting messages fall back to email. */
export async function withdrawOptIn(ctx: ReqCtx): Promise<MyChannels> {
  const c = ctx.tenant!.companyId;
  const at = ctx.deps.now().toISOString();
  const rows = await ctx.tx.query<{ id: string }>(
    `UPDATE channel_opt_ins SET status = 'withdrawn', withdrawn_at = $3,
       withdrawn_via = 'app' WHERE company_id = $1 AND user_id = $2
       AND status <> 'withdrawn' RETURNING id`, [c, ctx.user!.id, at]);
  await skipWaiting(ctx);
  for (const r of rows) {
    await channelAudit(ctx.tx, { companyId: c, at, actorUserId:
      ctx.user!.id, action: "whatsapp.opted-out",
    entityType: "channel-opt-in", entityId: r.id, data: { via: "app" } });
  }
  return myChannels(ctx);
}

async function skipWaiting(ctx: ReqCtx): Promise<void> {
  const ec = eventCtx(ctx);
  const waiting = await ctx.tx.query<DeliveryRowDb>(
    `SELECT * FROM notification_deliveries WHERE company_id = $1
       AND user_id = $2 AND channel = 'whatsapp'
       AND status IN ('queued', 'held') FOR UPDATE`,
    [ec.companyId, ctx.user!.id]);
  const s = await channelSealer(ctx.tx, ctx.deps, ec.companyId);
  for (const d of waiting) {
    await skipDelivery(ec, d, "no-opt-in", s.open("notification_deliveries",
      "payload", d.id, d.payload_enc));
  }
}
