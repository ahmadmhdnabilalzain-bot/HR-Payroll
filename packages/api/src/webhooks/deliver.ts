import type { WebhookErrorCode } from "@payroll/contract";
import { canonicalJson } from "../audit/canonical";
import { channelAudit } from "../channels/audit";
import { channelSealer } from "../channels/crypto";
import { emitEvent } from "../channels/events";
import { HttpFailure, type HttpResponse } from "../channels/ports";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { Enter } from "../http/context";
import {
  nextWebhookAttempt,
  PAUSE_AFTER_FAILED_DELIVERIES,
  webhookSignature,
} from "./sign";
import { checkWebhookUrl, isPublicAddress } from "./url-guard";

const LEASE_MS = 60_000;
interface Job { id: string; url: string; endpointId: string;
  secrets: string[]; eventId: string; body: string; attempt: number }
interface Result { code: number | null; error: WebhookErrorCode | null;
  ms: number }

async function claim(tx: Db, deps: HandlerDeps, c: string, id: string)
  : Promise<Job | null> {
  const now = deps.now();
  const [d] = await tx.query<{ endpoint_id: string; event_id: string;
    attempt_count: number; url: string; secret_enc: string;
    prev_secret_enc: string | null; prev_valid_until: string | null;
    type: string; entity_type: string; entity_id: string;
    outcome: string | null; ev_at: string }>(
    `SELECT d.endpoint_id, d.event_id, d.attempt_count, p.url, p.secret_enc,
       p.prev_secret_enc, p.prev_valid_until, e.type, e.entity_type,
       e.entity_id, e.outcome, e.created_at AS ev_at
     FROM webhook_deliveries d
     JOIN webhook_endpoints p ON p.company_id = d.company_id
       AND p.id = d.endpoint_id
     JOIN webhook_events e ON e.company_id = d.company_id
       AND e.id = d.event_id
     WHERE d.company_id = $1 AND d.id = $2 AND d.status = 'pending'
       AND (p.status = 'active' OR e.type = 'ping')
       AND (d.lease_until IS NULL OR d.lease_until < $3)
     FOR UPDATE OF d SKIP LOCKED`, [c, id, now.toISOString()]);
  if (d === undefined) return null;
  await tx.query(`UPDATE webhook_deliveries SET lease_until = $3,
    attempt_count = attempt_count + 1 WHERE company_id = $1 AND id = $2`,
  [c, id, new Date(now.getTime() + LEASE_MS).toISOString()]);
  const s = await channelSealer(tx, deps, c);
  const open = (col: string, v: string) =>
    s.open("webhook_endpoints", col, d.endpoint_id, v);
  const prevLive = d.prev_secret_enc !== null && d.prev_valid_until !== null &&
    new Date(d.prev_valid_until) > now;
  const evId = `evt_${d.event_id}`;
  const body = canonicalJson({ id: evId, type: d.type, createdAt: d.ev_at,
    companyId: c, data: { entityType: d.entity_type, entityId: d.entity_id,
      ...(d.outcome === null ? {} : { outcome: d.outcome }) } });
  return { id, url: d.url, endpointId: d.endpoint_id, eventId: evId, body,
    attempt: d.attempt_count + 1, secrets: [open("secret", d.secret_enc),
      ...(prevLive ? [open("secret", d.prev_secret_enc!)] : [])] };
}

/** Outside any transaction: URL, DNS (all public), pinned request. */
async function send(deps: HandlerDeps, j: Job): Promise<Result> {
  const t0 = deps.now().getTime();
  const done = (code: number | null, error: WebhookErrorCode | null) =>
    ({ code, error, ms: Math.max(0, deps.now().getTime() - t0) });
  const u = checkWebhookUrl(j.url);
  if (!u.ok) return done(null, "URL_NOT_ALLOWED");
  const addrs = await deps.channels.resolveHost(u.host);
  if (addrs.length === 0 || !addrs.every(isPublicAddress)) {
    return done(null, "HOST_NOT_PUBLIC");
  }
  const ts = Math.floor(deps.now().getTime() / 1000);
  let r: HttpResponse;
  try {
    r = await deps.channels.http.send({ method: "POST", url: j.url,
      timeoutMs: 10_000, pinAddress: addrs[0]!, body: j.body, headers: {
        "content-type": "application/json",
        "user-agent": "payroll-webhooks/1", "x-webhook-id": j.eventId,
        "x-webhook-timestamp": String(ts), "x-webhook-signature":
          webhookSignature(j.secrets, j.eventId, ts, j.body) } });
  } catch (e) {
    if (e instanceof HttpFailure) return done(null, e.code);
    throw e;
  }
  if (r.status >= 200 && r.status < 300) return done(r.status, null);
  return done(r.status, r.status >= 300 && r.status < 400
    ? "REDIRECT_NOT_FOLLOWED" : "HTTP_STATUS");
}

async function pause(tx: Db, deps: HandlerDeps, c: string, ep: string,
  reason: "failing" | "gone"): Promise<void> {
  await tx.query(`UPDATE webhook_endpoints SET status = 'paused',
    paused_reason = $3 WHERE company_id = $1 AND id = $2`, [c, ep, reason]);
  await channelAudit(tx, { companyId: c, at: deps.now().toISOString(),
    actorUserId: null, action: "webhook.paused",
    entityType: "webhook-endpoint", entityId: ep,
    data: { pausedReason: reason } });
  await emitEvent({ tx, deps, companyId: c }, { type: "webhook.paused",
    endpointId: ep });
}

async function record(tx: Db, deps: HandlerDeps, c: string, j: Job,
  r: Result): Promise<"succeeded" | "failed" | "retried"> {
  const now = deps.now();
  await tx.query(`INSERT INTO webhook_attempts (company_id, delivery_id, n,
    at, status_code, error, duration_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [c, j.id, j.attempt, now.toISOString(), r.code, r.error, r.ms]);
  // 410 Gone: no retries, and the endpoint pauses below.
  const next = r.error === null || r.code === 410 ? null
    : nextWebhookAttempt(j.attempt, now);
  const status = r.error === null ? "succeeded" : next ? "pending" : "failed";
  await tx.query(`UPDATE webhook_deliveries SET status = $3, lease_until =
    NULL, next_attempt_at = $4, finished_at = $5 WHERE company_id = $1
    AND id = $2`, [c, j.id, status, next?.toISOString() ?? null,
    status === "pending" ? null : now.toISOString()]);
  const [ep] = await tx.query<{ consecutive_failures: number;
    status: string }>(`UPDATE webhook_endpoints SET consecutive_failures =
    CASE WHEN $3 THEN 0 WHEN $4 THEN consecutive_failures + 1 ELSE
    consecutive_failures END WHERE company_id = $1 AND id = $2
    RETURNING consecutive_failures, status`, [c, j.endpointId,
    status === "succeeded", status === "failed"]);
  if (ep?.status === "active" && r.code === 410) {
    await pause(tx, deps, c, j.endpointId, "gone");
  } else if (ep?.status === "active" && status === "failed" &&
    ep.consecutive_failures >= PAUSE_AFTER_FAILED_DELIVERIES) {
    await pause(tx, deps, c, j.endpointId, "failing");
  }
  return status === "pending" ? "retried" : status;
}

/** Claim (lease), send (no transaction), record; at least once. */
export async function deliverDueWebhooks(enter: Enter, deps: HandlerDeps,
  limit = 100) {
  const out = { succeeded: 0, failed: 0, retried: 0 };
  const due = await enter({ companyId: null, userId: null }, (tx) =>
    tx.query<{ company_id: string; delivery_id: string }>(
      "SELECT * FROM due_webhook_deliveries($1, $2)",
      [deps.now().toISOString(), limit]));
  for (const d of due) {
    const t = { companyId: d.company_id, userId: null };
    const j = await enter(t, (tx) => claim(tx, deps, d.company_id,
      d.delivery_id));
    if (j === null) continue;
    const r = await send(deps, j);
    out[await enter(t, (tx) => record(tx, deps, d.company_id, j, r))] += 1;
  }
  return out;
}
