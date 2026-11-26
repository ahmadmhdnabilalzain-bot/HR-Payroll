import type {
  DeliveryRow,
  MarkRead,
  Notification,
} from "@payroll/contract";
import type { ReqCtx } from "../http/context";

interface NoticeRow {
  id: string;
  kind: Notification["kind"];
  title: string;
  body: string;
  link: Notification["link"];
  created_at: string;
  read_at: string | null;
  deliveries: Notification["deliveries"] | null;
}

interface Query { unreadOnly?: boolean; before?: string; limit?: number }

/** Own notices, newest first, with each delivery's channel and status. */
export async function listNotifications(ctx: ReqCtx<unknown, Query>) {
  const q = ctx.query;
  const limit = q.limit ?? 50;
  const rows = await ctx.tx.query<NoticeRow>(
    `SELECT n.*, (SELECT json_agg(json_build_object('channel', d.channel,
       'status', d.status) ORDER BY d.channel) FROM notification_deliveries d
       WHERE d.company_id = n.company_id AND d.notification_id = n.id)
       AS deliveries
     FROM notifications n WHERE n.company_id = $1 AND n.user_id = $2
       AND ($3::boolean IS NOT TRUE OR n.read_at IS NULL)
       AND ($4::timestamptz IS NULL OR n.created_at < $4)
     ORDER BY n.created_at DESC, n.id DESC LIMIT $5`,
    [ctx.tenant!.companyId, ctx.user!.id, q.unreadOnly ?? false,
      q.before ?? null, limit]);
  const items: Notification[] = rows.map((r) => ({ id: r.id, kind: r.kind,
    title: r.title, body: r.body, link: r.link, createdAt: r.created_at,
    readAt: r.read_at, deliveries: r.deliveries ?? [] }));
  return { items, nextBefore: items.length === limit
    ? items.at(-1)!.createdAt : null };
}

/** Own notices only; other people's ids are ignored, not errors. */
export async function markRead(ctx: ReqCtx<MarkRead>) {
  const all = "all" in ctx.body;
  const ids = "ids" in ctx.body ? ctx.body.ids : [];
  const rows = await ctx.tx.query(
    `UPDATE notifications SET read_at = $3 WHERE company_id = $1
       AND user_id = $2 AND read_at IS NULL
       AND ($4 OR id = ANY ($5::uuid[])) RETURNING id`,
    [ctx.tenant!.companyId, ctx.user!.id, ctx.deps.now().toISOString(),
      all, `{${ids.join(",")}}`]);
  return { updated: rows.length };
}

interface DeliveryDb {
  id: string; notification_id: string | null; user_id: string;
  channel: DeliveryRow["channel"]; kind: DeliveryRow["kind"];
  status: DeliveryRow["status"]; reason: string | null; attempts: number;
  not_before: string | null; sent_at: string | null;
  language_fallback: boolean; provider: string | null;
}

interface DeliveryQ {
  status?: string; channel?: string; userId?: string; before?: string;
  limit?: number;
}

/** The delivery log (owner, hr): statuses only, never text or address. */
export async function listDeliveries(ctx: ReqCtx<unknown, DeliveryQ>) {
  const q = ctx.query;
  const rows = await ctx.tx.query<DeliveryDb>(
    `SELECT * FROM notification_deliveries WHERE company_id = $1
       AND ($2::text IS NULL OR status = $2)
       AND ($3::text IS NULL OR channel = $3)
       AND ($4::uuid IS NULL OR user_id = $4)
       AND ($5::timestamptz IS NULL OR created_at < $5)
     ORDER BY created_at DESC, id DESC LIMIT $6`,
    [ctx.tenant!.companyId, q.status ?? null, q.channel ?? null,
      q.userId ?? null, q.before ?? null, q.limit ?? 50]);
  return { items: rows.map((r): DeliveryRow => ({ id: r.id,
    notificationId: r.notification_id, userId: r.user_id,
    channel: r.channel, kind: r.kind, status: r.status, reason: r.reason,
    attempts: r.attempts, notBefore: r.not_before, sentAt: r.sent_at,
    languageFallback: r.language_fallback, provider: r.provider })) };
}
