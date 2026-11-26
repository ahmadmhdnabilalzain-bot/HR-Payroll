import type {
  WebhookEndpoint,
  WebhookEndpointCreate,
  WebhookEndpointUpdate,
} from "@payroll/contract";
import { channelAudit } from "../channels/audit";
import { channelSealer } from "../channels/crypto";
import { eventCtx } from "../channels/notify";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { insertWebhookDelivery, insertWebhookEvent } from "./fanout";
import { ENDPOINTS_PER_COMPANY } from "./sign";
import { checkWebhookUrl } from "./url-guard";
import { deliveryView } from "./deliveries";

type Id = { id: string };
interface EpRow {
  id: string; url: string; description: string; events: string[];
  status: "active" | "paused"; paused_reason: WebhookEndpoint["pausedReason"];
  secret_last4: string; consecutive_failures: number; created_at: string;
}

const view = (r: EpRow): WebhookEndpoint => ({ id: r.id, url: r.url,
  description: r.description, events: r.events as WebhookEndpoint["events"],
  status: r.status, pausedReason: r.paused_reason,
  secretHint: `whsec_…${r.secret_last4}`,
  consecutiveFailures: r.consecutive_failures, createdAt: r.created_at });

const SELECT = `SELECT id, url, description, array_to_json(events) AS events,
  status, paused_reason, secret_last4, consecutive_failures, created_at
  FROM webhook_endpoints`;

export async function loadEndpoint(ctx: ReqCtx, id: string, lock = false) {
  const [r] = await ctx.tx.query<EpRow>(`${SELECT} WHERE company_id = $1
    AND id = $2 ${lock ? "FOR UPDATE" : ""}`, [ctx.tenant!.companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function listEndpoints(ctx: ReqCtx) {
  const rows = await ctx.tx.query<EpRow>(`${SELECT} WHERE company_id = $1
    ORDER BY created_at, id`, [ctx.tenant!.companyId]);
  return { items: rows.map(view) };
}

function urlOk(url: string): void {
  if (!checkWebhookUrl(url).ok) throw new ApiError("WEBHOOK_URL_NOT_ALLOWED");
}

async function newSecret(ctx: ReqCtx, id: string) {
  const secret = `whsec_${Buffer.from(ctx.deps.randomBytes(32))
    .toString("base64url")}`;
  const s = await channelSealer(ctx.tx, ctx.deps, ctx.tenant!.companyId);
  return { secret, enc: s.seal("webhook_endpoints", "secret", id, secret) };
}

const audit = (ctx: ReqCtx, action: string, id: string,
  data: Record<string, unknown>) => channelAudit(ctx.tx, {
  companyId: ctx.tenant!.companyId, at: ctx.deps.now().toISOString(),
  actorUserId: ctx.user!.id, action, entityType: "webhook-endpoint",
  entityId: id, data: data as never });

/** Owner with MFA; https public names only; the secret shown once. */
export async function createEndpoint(ctx: ReqCtx<WebhookEndpointCreate>) {
  const c = ctx.tenant!.companyId;
  urlOk(ctx.body.url);
  const n = await ctx.tx.query("SELECT 1 FROM webhook_endpoints WHERE " +
    "company_id = $1 FOR UPDATE", [c]);
  if (n.length >= ENDPOINTS_PER_COMPANY) {
    throw new ApiError("WEBHOOK_ENDPOINT_LIMIT");
  }
  const id = ctx.deps.newId();
  const s = await newSecret(ctx, id);
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO webhook_endpoints (id, company_id, url, description,
       events, status, secret_enc, secret_last4, created_by, created_at,
       updated_at) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $9)`,
    [id, c, ctx.body.url, ctx.body.description ?? "",
      `{${ctx.body.events.join(",")}}`, s.enc, s.secret.slice(-4),
      ctx.user!.id, at]);
  await audit(ctx, "webhook.endpoint-created", id,
    { events: ctx.body.events });
  return { ...view(await loadEndpoint(ctx, id)), secret: s.secret };
}

export async function updateEndpoint(ctx: ReqCtx<WebhookEndpointUpdate,
  unknown, Id>) {
  const b = ctx.body;
  const r = await loadEndpoint(ctx, ctx.params.id, true);
  if (b.url !== undefined) urlOk(b.url);
  const status = b.status ?? r.status;
  await ctx.tx.query(
    `UPDATE webhook_endpoints SET url = $3, description = $4, events = $5,
       status = $6, paused_reason = $7, consecutive_failures = $8,
       updated_at = $9 WHERE company_id = $1 AND id = $2`,
    [ctx.tenant!.companyId, r.id, b.url ?? r.url,
      b.description ?? r.description, `{${(b.events ?? r.events).join(",")}}`,
      status, status === "paused" ? (b.status === "paused" ? "manual"
        : r.paused_reason) : null,
      b.status === "active" ? 0 : r.consecutive_failures,
      ctx.deps.now().toISOString()]);
  await audit(ctx, "webhook.endpoint-updated", r.id, { changed:
    Object.keys(b).filter((k) => b[k as keyof typeof b] !== undefined) });
  return view(await loadEndpoint(ctx, r.id));
}

/** New secret; the old one is also sent until `graceHours` pass. */
export async function rotateSecret(ctx: ReqCtx<{ graceHours: number },
  unknown, Id>) {
  const r = await loadEndpoint(ctx, ctx.params.id, true);
  const s = await newSecret(ctx, r.id);
  const now = ctx.deps.now();
  await ctx.tx.query(
    `UPDATE webhook_endpoints SET prev_secret_enc = secret_enc,
       prev_valid_until = $3, secret_enc = $4, secret_last4 = $5,
       updated_at = $6 WHERE company_id = $1 AND id = $2`,
    [ctx.tenant!.companyId, r.id, new Date(now.getTime() +
      ctx.body.graceHours * 3600_000).toISOString(), s.enc,
    s.secret.slice(-4), now.toISOString()]);
  await audit(ctx, "webhook.secret-rotated", r.id,
    { graceHours: ctx.body.graceHours });
  return { ...view(await loadEndpoint(ctx, r.id)), secret: s.secret };
}

/** A ping delivery, sent even while the endpoint is paused. */
export async function testEndpoint(ctx: ReqCtx<unknown, unknown, Id>) {
  const r = await loadEndpoint(ctx, ctx.params.id);
  const c = eventCtx(ctx);
  const ev = await insertWebhookEvent(c, { type: "ping",
    entityType: "endpoint", entityId: r.id });
  return deliveryView(ctx, await insertWebhookDelivery(c, r.id, ev));
}

/** The same event id again, new timestamp and signature. */
export async function redeliver(ctx: ReqCtx<unknown, unknown, Id>) {
  const c = ctx.tenant!.companyId;
  const [d] = await ctx.tx.query<{ endpoint_id: string; event_id: string }>(
    `SELECT endpoint_id, event_id FROM webhook_deliveries
     WHERE company_id = $1 AND id = $2`, [c, ctx.params.id]);
  if (d === undefined) throw new ApiError("NOT_FOUND");
  const ep = await loadEndpoint(ctx, d.endpoint_id);
  if (ep.status === "paused") throw new ApiError("WEBHOOK_PAUSED");
  const id = await insertWebhookDelivery(eventCtx(ctx), ep.id, d.event_id);
  await audit(ctx, "webhook.redelivered", ep.id, {});
  return deliveryView(ctx, id);
}
