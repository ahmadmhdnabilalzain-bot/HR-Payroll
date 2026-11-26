import type { WebhookDelivery } from "@payroll/contract";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

interface Row {
  id: string; endpoint_id: string; event_id: string;
  type: WebhookDelivery["eventType"]; status: WebhookDelivery["status"];
  next_attempt_at: string | null; created_at: string;
  attempts: { n: number; at: string; statusCode: number | null;
    error: WebhookDelivery["attempts"][number]["error"];
    durationMs: number }[] | null;
}

const SELECT = `SELECT d.id, d.endpoint_id, d.event_id, e.type, d.status,
  d.next_attempt_at, d.created_at, (SELECT json_agg(json_build_object(
    'n', a.n, 'at', a.at, 'statusCode', a.status_code, 'error', a.error,
    'durationMs', a.duration_ms) ORDER BY a.n) FROM webhook_attempts a
    WHERE a.company_id = d.company_id AND a.delivery_id = d.id) AS attempts
  FROM webhook_deliveries d JOIN webhook_events e
    ON e.company_id = d.company_id AND e.id = d.event_id`;

const toView = (r: Row): WebhookDelivery => ({ id: r.id,
  endpointId: r.endpoint_id, eventId: `evt_${r.event_id}`,
  eventType: r.type, status: r.status, nextAttemptAt: r.next_attempt_at,
  createdAt: r.created_at, attempts: (r.attempts ?? []).map((a) => ({
    ...a, at: new Date(a.at).toISOString() })) });

export async function deliveryRows(tx: Db, c: string, where: string,
  args: unknown[]): Promise<WebhookDelivery[]> {
  const rows = await tx.query<Row>(`${SELECT} WHERE d.company_id = $1
    AND ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT 100`,
  [c, ...args]);
  return rows.map(toView);
}

export async function deliveryView(ctx: ReqCtx, id: string) {
  const [d] = await deliveryRows(ctx.tx, ctx.tenant!.companyId,
    "d.id = $2", [id]);
  if (d === undefined) throw new ApiError("NOT_FOUND");
  return d;
}

export async function listDeliveries(ctx: ReqCtx<unknown, {
  endpointId?: string; status?: string; before?: string; limit?: number }>) {
  const q = ctx.query;
  const items = await deliveryRows(ctx.tx, ctx.tenant!.companyId,
    `($2::uuid IS NULL OR d.endpoint_id = $2)
     AND ($3::text IS NULL OR d.status = $3)
     AND ($4::timestamptz IS NULL OR d.created_at < $4)`,
    [q.endpointId ?? null, q.status ?? null, q.before ?? null]);
  return { items: items.slice(0, q.limit ?? 50) };
}
