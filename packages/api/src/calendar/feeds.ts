import { timingSafeEqual } from "node:crypto";
import type {
  CalendarFeed,
  CalendarFeedCreate,
  CalendarFeedCreated,
  FeedScope,
  Role,
} from "@payroll/contract";
import { addDays } from "@payroll/engine";
import { sha256Hex } from "../audit/canonical";
import { channelAudit } from "../channels/audit";
import type { Db } from "../db/db";
import { TextReply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";
import { feedEvents, toIcsFeed } from "./feed";
import { formatFeedToken, parseFeedToken } from "./feed-token";
import { feedInput } from "./sources";

/** Product defaults. */
export const FEED_PAST_DAYS = 90;
export const FEED_FUTURE_DAYS = 365;
export const FEEDS_PER_USER = 5;
export const FEED_TOUCH_MINUTES = 10;

const SCOPE_ROLES: Record<FeedScope, readonly Role[]> = {
  my: ["owner", "hr", "manager", "employee"],
  team: ["owner", "hr", "manager"],
  "company-deadlines": ["owner", "hr"],
};

interface FeedRow {
  id: string; user_id: string; scope: FeedScope; secret_hash: string;
  url_hint: string; status: "active" | "revoked"; created_at: string;
  last_fetched_at: string | null;
}

const view = (r: FeedRow): CalendarFeed => ({ id: r.id, scope: r.scope,
  status: r.status, createdAt: r.created_at,
  lastFetchedAt: r.last_fetched_at, urlHint: r.url_hint });

export async function listFeeds(ctx: ReqCtx) {
  const rows = await ctx.tx.query<FeedRow>(
    `SELECT * FROM calendar_feeds WHERE company_id = $1 AND user_id = $2
     ORDER BY created_at DESC, id DESC`,
    [ctx.tenant!.companyId, ctx.user!.id]);
  return { items: rows.map(view) };
}

async function feedAudit(ctx: ReqCtx, action: string, id: string,
  scope: FeedScope) {
  await channelAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "calendar-feed", entityId: id, data: { scope } });
}

/** A secret URL, shown once; scope by role; five active per person. */
export async function createFeed(ctx: ReqCtx<CalendarFeedCreate>)
  : Promise<CalendarFeedCreated> {
  const c = ctx.tenant!.companyId;
  const base = ctx.deps.channels.publicApiBaseUrl;
  if (base === null) throw new ApiError("CHANNEL_NOT_CONFIGURED");
  if (!SCOPE_ROLES[ctx.body.scope].includes(ctx.tenant!.role)) {
    throw new ApiError("FORBIDDEN");
  }
  const active = await ctx.tx.query(
    `SELECT 1 FROM calendar_feeds WHERE company_id = $1 AND user_id = $2
       AND status = 'active' FOR UPDATE`, [c, ctx.user!.id]);
  if (active.length >= FEEDS_PER_USER) throw new ApiError("FEED_LIMIT");
  const id = ctx.deps.newId();
  const token = formatFeedToken(c, id, ctx.deps.randomBytes(32));
  const secret = parseFeedToken(token)!.secret;
  const hint = `…${token.slice(-10, -4)}`;
  await ctx.tx.query(
    `INSERT INTO calendar_feeds (id, company_id, user_id, scope,
       secret_hash, url_hint, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)`,
    [id, c, ctx.user!.id, ctx.body.scope, sha256Hex(secret), hint,
      ctx.deps.now().toISOString()]);
  await feedAudit(ctx, "calendar.feed-created", id, ctx.body.scope);
  const [r] = await ctx.tx.query<FeedRow>("SELECT * FROM calendar_feeds " +
    "WHERE company_id = $1 AND id = $2", [c, id]);
  return { ...view(r!), url: `${base}/v1/calendar/${token}` };
}

export async function revokeFeed(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<CalendarFeed> {
  const c = ctx.tenant!.companyId;
  const [r] = await ctx.tx.query<FeedRow>(
    `UPDATE calendar_feeds SET status = 'revoked', revoked_at = coalesce(
       revoked_at, $4) WHERE company_id = $1 AND id = $2 AND user_id = $3
     RETURNING *`, [c, ctx.params.id, ctx.user!.id,
      ctx.deps.now().toISOString()]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  await feedAudit(ctx, "calendar.feed-revoked", r.id, r.scope);
  return view(r);
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The feed row and its owner's role, or null (one 404 for all). */
async function liveFeed(tx: Db, c: string, feedId: string, secret: string) {
  const [r] = await tx.query<FeedRow & { role: Role | null;
    employee_id: string | null }>(
    `SELECT f.*, m.role, m.employee_id FROM calendar_feeds f
     LEFT JOIN memberships m ON m.company_id = f.company_id
       AND m.user_id = f.user_id
     WHERE f.company_id = $1 AND f.id = $2`, [c, feedId]);
  const ok = r !== undefined && r.status === "active" &&
    same(r.secret_hash, sha256Hex(secret)) && r.role !== null &&
    SCOPE_ROLES[r.scope].includes(r.role);
  return ok ? r! : null;
}

async function touch(tx: Db, c: string, r: FeedRow, now: Date) {
  const last = r.last_fetched_at === null ? 0
    : new Date(r.last_fetched_at).getTime();
  if (now.getTime() - last < FEED_TOUCH_MINUTES * 60_000) return;
  await tx.query("UPDATE calendar_feeds SET last_fetched_at = $3 " +
    "WHERE company_id = $1 AND id = $2", [c, r.id, now.toISOString()]);
}

const HEADERS = { "Content-Type": "text/calendar; charset=utf-8",
  "Cache-Control": "private, max-age=900", "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex" };

/** GET /v1/calendar/{token} (public): any failure is the same 404. */
export async function serveFeed(ctx: ReqCtx<unknown, unknown,
  { token: string }>): Promise<TextReply> {
  const t = parseFeedToken(ctx.params.token);
  if (t === null) throw new ApiError("NOT_FOUND");
  const now = ctx.deps.now();
  const text = await ctx.enter({ companyId: t.companyId, userId: null },
    async (tx) => {
      const r = await liveFeed(tx, t.companyId, t.feedId, t.secret);
      if (r === null) return null;
      await touch(tx, t.companyId, r, now);
      const today = dubaiDate(now);
      const input = await feedInput(tx, t.companyId, { role: r.role!,
        employeeId: r.employee_id }, r.scope,
      addDays(today, -FEED_PAST_DAYS), addDays(today, FEED_FUTURE_DAYS));
      return toIcsFeed("Payroll calendar", feedEvents(input), now);
    });
  if (text === null) throw new ApiError("NOT_FOUND");
  return new TextReply(text, HEADERS);
}
