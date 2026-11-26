import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { Enter } from "../http/context";
import { channelSealer } from "./crypto";
import { skipDelivery, type DeliveryRowDb } from "./fallback";
import type { EventCtx } from "./notify";
import { recordOutcome, type Payload } from "./dispatch-record";
import { consumeRate } from "./rate";
import { settingsBody } from "./settings";
import type { SendOutcome } from "./ports";
import { prepareWhatsApp } from "../whatsapp/actions";

export interface DispatchResult {
  sent: number; failed: number; skipped: number; retried: number;
  fellBack: number;
}

/** Lease while a row is being sent (Ruling 4: at least once). */
const LEASE_MS = 120_000;

interface Job { row: DeliveryRowDb; payload: Payload; to: string }
type Claim = { job: Job } | { skipped: boolean; fellBack: boolean } | null;

const NO_TENANT = { companyId: null, userId: null };

async function lockDue(tx: Db, c: string, id: string, now: Date) {
  const [d] = await tx.query<DeliveryRowDb>(
    `SELECT * FROM notification_deliveries WHERE company_id = $1
       AND id = $2 FOR UPDATE SKIP LOCKED`, [c, id]);
  if (d === undefined) return null;
  const due = ((d.status === "queued" || d.status === "held") &&
    (d.not_before === null || new Date(d.not_before) <= now)) ||
    (d.status === "sending" && d.lease_until !== null &&
      new Date(d.lease_until) < now);
  return due ? d : null;
}

async function emailOf(tx: Db, userId: string): Promise<string | null> {
  const [u] = await tx.query<{ email: string }>(
    "SELECT email FROM users WHERE id = $1", [userId]);
  return u?.email ?? null;
}

async function phoneOf(c: EventCtx, d: DeliveryRowDb)
  : Promise<string | null> {
  const status = d.kind === "channel-verify-code" ? "pending" : "active";
  const [o] = await c.tx.query<{ id: string; phone_enc: string }>(
    `SELECT id, phone_enc FROM channel_opt_ins WHERE company_id = $1
       AND user_id = $2 AND status = $3`, [c.companyId, d.user_id, status]);
  if (o === undefined) return null;
  const s = await channelSealer(c.tx, c.deps, c.companyId);
  return s.open("channel_opt_ins", "phone", o.id, o.phone_enc);
}

async function rateOk(c: EventCtx, d: DeliveryRowDb, now: Date) {
  if (d.kind === "channel-verify-code") return true;
  const s = (await settingsBody(c.tx, c.companyId)).body;
  const user = await consumeRate(c.tx, c.companyId, "wa-user", d.user_id,
    s.whatsappHourlyPerUser, 3600, now);
  const all = await consumeRate(c.tx, c.companyId, "wa-company", "all",
    s.whatsappDailyCap, 86400, now);
  return user.allowed && all.allowed;
}

/** The recipient still has an unrevoked membership (review M5). */
async function stillMember(tx: Db, c: string, userId: string) {
  const r = await tx.query("SELECT 1 FROM memberships WHERE company_id = " +
    "$1 AND user_id = $2 AND revoked_at IS NULL", [c, userId]);
  return r.length > 0;
}

/** Locks, leases and readies one row; or ends it as skipped. */
async function claim(c: EventCtx, id: string, now: Date): Promise<Claim> {
  const d = await lockDue(c.tx, c.companyId, id, now);
  if (d === null) return null;
  if (!(await stillMember(c.tx, c.companyId, d.user_id))) {
    // Queued before the access was revoked: dropped, no fallback.
    await c.tx.query(
      `UPDATE notification_deliveries SET status = 'skipped',
         reason = 'not-a-member', lease_until = NULL
       WHERE company_id = $1 AND id = $2`, [c.companyId, d.id]);
    return { skipped: true, fellBack: false };
  }
  const s = await channelSealer(c.tx, c.deps, c.companyId);
  const raw = s.open("notification_deliveries", "payload", d.id,
    d.payload_enc);
  const to = d.channel === "email" ? await emailOf(c.tx, d.user_id)
    : await phoneOf(c, d);
  const skip = to === null ? (d.channel === "email" ? "no-address"
    : "no-opt-in") : d.channel === "whatsapp" && !await rateOk(c, d, now)
    ? "rate-limited" : null;
  if (skip !== null) {
    return { skipped: true, fellBack: await skipDelivery(c, d, skip, raw) };
  }
  await c.tx.query(
    `UPDATE notification_deliveries SET status = 'sending',
       lease_until = $3, attempts = attempts + 1, last_attempt_at = $4
     WHERE company_id = $1 AND id = $2`, [c.companyId, d.id,
      new Date(now.getTime() + LEASE_MS).toISOString(), now.toISOString()]);
  const payload = JSON.parse(raw) as Payload;
  const row = { ...d, attempts: d.attempts + 1 };
  const ready = d.channel === "whatsapp"
    ? await prepareWhatsApp(c, row, payload, to!) : payload;
  return { job: { row, payload: ready, to: to! } };
}

function send(deps: HandlerDeps, j: Job): Promise<SendOutcome> {
  const key = j.row.id;
  if (j.row.channel === "email") {
    return deps.channels.email.send({ to: j.to,
      subject: j.payload.subject, text: j.payload.text,
      idempotencyKey: key });
  }
  return deps.channels.whatsapp.sendTemplate({ toE164: j.to,
    templateName: j.payload.templateName ?? "", language: "en",
    bodyParams: j.payload.params, buttonPayloads: j.payload.buttons ?? [],
    idempotencyKey: key });
}

async function one(enter: Enter, deps: HandlerDeps, companyId: string,
  id: string, out: DispatchResult): Promise<void> {
  const ctx = (tx: Db): EventCtx => ({ tx, deps, companyId });
  const t = { companyId, userId: null };
  const c = await enter(t, (tx) => claim(ctx(tx), id, deps.now()));
  if (c === null) return;
  if (!("job" in c)) {
    out.skipped += 1;
    if (c.fellBack) out.fellBack += 1;
    return;
  }
  const outcome = await send(deps, c.job);
  const r = await enter(t, (tx) => recordOutcome(ctx(tx), c.job.row,
    c.job.payload, outcome));
  out[r.result] += 1;
  if (r.fellBack) out.fellBack += 1;
}

/**
 * Sends what is due, across companies: claim (one transaction), send
 * (no transaction), record (a second transaction). A crash between
 * steps leaves the row leased; it is picked again when the lease ends.
 */
export async function dispatchDue(enter: Enter, deps: HandlerDeps,
  limit = 100): Promise<DispatchResult> {
  const out: DispatchResult = { sent: 0, failed: 0, skipped: 0, retried: 0,
    fellBack: 0 };
  const due = await enter(NO_TENANT, (tx) => tx.query<{ company_id: string;
    delivery_id: string }>(
    "SELECT * FROM due_notification_deliveries($1, $2)",
    [deps.now().toISOString(), limit]));
  for (const d of due) await one(enter, deps, d.company_id, d.delivery_id,
    out);
  return out;
}
