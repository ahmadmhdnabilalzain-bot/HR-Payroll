import {
  API_KEY_DEFAULT_RATE,
  type ApiKey,
  type ApiKeyCreate,
  type ApiKeyUpdate,
} from "@payroll/contract";
import { insertMembership } from "../auth/accounts";
import { channelAudit } from "../channels/audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { formatApiKey, hashKeySecret, parseApiKey } from "./format";

type Id = { id: string };
interface Row {
  id: string; key_id: string; name: string; scopes: ApiKey["scopes"];
  rate_limit_per_minute: number; status: ApiKey["status"];
  created_at: string; expires_at: string | null; last_used_at: string | null;
  rotated_at: string | null; prev_valid_until: string | null;
}

const SELECT = `SELECT id, key_id, name, array_to_json(scopes) AS scopes,
  rate_limit_per_minute, status, created_at, expires_at, last_used_at,
  rotated_at, prev_valid_until FROM api_keys`;

const view = (r: Row): ApiKey => ({ id: r.id, name: r.name,
  prefix: `hrk_${r.key_id}`, scopes: r.scopes,
  rateLimitPerMinute: r.rate_limit_per_minute, status: r.status,
  createdAt: r.created_at, expiresAt: r.expires_at,
  lastUsedAt: r.last_used_at, rotatedAt: r.rotated_at,
  previousValidUntil: r.prev_valid_until });

async function load(ctx: ReqCtx, id: string): Promise<Row> {
  const [r] = await ctx.tx.query<Row>(`${SELECT} WHERE company_id = $1
    AND id = $2`, [ctx.tenant!.companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function listKeys(ctx: ReqCtx) {
  const rows = await ctx.tx.query<Row>(`${SELECT} WHERE company_id = $1
    ORDER BY created_at, id`, [ctx.tenant!.companyId]);
  return { items: rows.map(view) };
}

const audit = (ctx: ReqCtx, action: string, id: string,
  data: Record<string, unknown>) => channelAudit(ctx.tx, {
  companyId: ctx.tenant!.companyId, at: ctx.deps.now().toISOString(),
  actorUserId: ctx.user!.id, action, entityType: "api-key", entityId: id,
  data: data as never });

const secretOf = (ctx: ReqCtx, keyId: string) => {
  const key = formatApiKey(keyId, ctx.deps.randomBytes(32));
  return { key, hash: hashKeySecret(parseApiKey(key)!.secret) };
};

/** A service user (role hr, no password) per key; secret shown once. */
export async function createKey(ctx: ReqCtx<ApiKeyCreate>) {
  const c = ctx.tenant!.companyId;
  const b = ctx.body;
  const keyId = Buffer.from(ctx.deps.randomBytes(8)).toString("hex");
  const id = ctx.deps.newId();
  const userId = ctx.deps.newId();
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO users (id, email, display_name, password_hash, created_at,
       kind) VALUES ($1, $2, $3, NULL, $4, 'service')`,
    [userId, `apikey-${keyId}@service.invalid`, `API key: ${b.name}`, at]);
  await insertMembership(ctx.tx, { companyId: c, userId, role: "hr",
    employeeId: null, at });
  const s = secretOf(ctx, keyId);
  const rate = b.rateLimitPerMinute ?? API_KEY_DEFAULT_RATE;
  await ctx.tx.query(
    `INSERT INTO api_keys (id, company_id, key_id, name, service_user_id,
       scopes, rate_limit_per_minute, status, secret_hash, created_by,
       created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7,
       'active', $8, $9, $10, $11)`,
    [id, c, keyId, b.name, userId, `{${b.scopes.join(",")}}`, rate, s.hash,
      ctx.user!.id, at, b.expiresAt ?? null]);
  await audit(ctx, "apikey.created", id, { scopes: b.scopes,
    rateLimitPerMinute: rate });
  return { key: view(await load(ctx, id)), secret: s.key };
}

async function live(ctx: ReqCtx, id: string): Promise<Row> {
  const r = await load(ctx, id);
  if (r.status === "revoked") throw new ApiError("API_KEY_REVOKED");
  return r;
}

export async function updateKey(ctx: ReqCtx<ApiKeyUpdate, unknown, Id>) {
  const r = await live(ctx, ctx.params.id);
  await ctx.tx.query(`UPDATE api_keys SET name = $3,
    rate_limit_per_minute = $4 WHERE company_id = $1 AND id = $2`,
  [ctx.tenant!.companyId, r.id, ctx.body.name ?? r.name,
    ctx.body.rateLimitPerMinute ?? r.rate_limit_per_minute]);
  await audit(ctx, "apikey.updated", r.id, { changed: Object.keys(ctx.body)
    .filter((k) => ctx.body[k as keyof ApiKeyUpdate] !== undefined) });
  return view(await load(ctx, r.id));
}

/** New secret; the old one works until `graceHours` pass. */
export async function rotateKey(ctx: ReqCtx<{ graceHours: number }, unknown,
  Id>) {
  const r = await live(ctx, ctx.params.id);
  const s = secretOf(ctx, r.key_id);
  const now = ctx.deps.now();
  await ctx.tx.query(`UPDATE api_keys SET prev_secret_hash = secret_hash,
    prev_valid_until = $3, secret_hash = $4, rotated_at = $5
    WHERE company_id = $1 AND id = $2`, [ctx.tenant!.companyId, r.id,
    new Date(now.getTime() + ctx.body.graceHours * 3600_000).toISOString(),
    s.hash, now.toISOString()]);
  await audit(ctx, "apikey.rotated", r.id,
    { graceHours: ctx.body.graceHours });
  return { key: view(await load(ctx, r.id)), secret: s.key };
}

/** Both secrets stop at once. */
export async function revokeKey(ctx: ReqCtx<unknown, unknown, Id>) {
  const r = await load(ctx, ctx.params.id);
  await ctx.tx.query(`UPDATE api_keys SET status = 'revoked',
    revoked_at = coalesce(revoked_at, $3) WHERE company_id = $1 AND id = $2`,
  [ctx.tenant!.companyId, r.id, ctx.deps.now().toISOString()]);
  await audit(ctx, "apikey.revoked", r.id, {});
  return view(await load(ctx, r.id));
}
