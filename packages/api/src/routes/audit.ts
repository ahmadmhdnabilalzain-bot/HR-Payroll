import type { AuditEvent } from "@payroll/contract";
import { verifyChain } from "../audit/audit";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";

const DEFAULT_LIMIT = 50;

interface Row {
  id: string;
  seq: bigint;
  at: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  data: AuditEvent["data"];
  prev_hash: string;
  hash: string;
}

const toEvent = (r: Row): AuditEvent => ({ id: r.id, seq: Number(r.seq),
  at: r.at, actorUserId: r.actor_user_id, action: r.action,
  entityType: r.entity_type, entityId: r.entity_id, data: r.data,
  prevHash: r.prev_hash, hash: r.hash });

/** Newest first; `before` is a seq; nextBefore null on the last page. */
async function list(ctx: ReqCtx<unknown, { before?: number;
  limit?: number }>) {
  const limit = ctx.query.limit ?? DEFAULT_LIMIT;
  const rows = await ctx.tx.query<Row>(
    `SELECT * FROM audit_events WHERE company_id = $1
       AND ($2::bigint IS NULL OR seq < $2)
     ORDER BY seq DESC LIMIT $3`,
    [ctx.tenant!.companyId, ctx.query.before ?? null, limit]);
  const items = rows.map(toEvent);
  const last = items.at(-1);
  return { items, nextBefore: items.length === limit && last !== undefined
    && last.seq > 1 ? last.seq : null };
}

export function registerAuditRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listAuditEvents", list);
  register(app, deps, "verifyAuditChain", (ctx) =>
    verifyChain(ctx.tx, ctx.tenant!.companyId));
}
