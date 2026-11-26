import type {
  ApplicationCreate,
  ApplicationQuery,
  Stage,
  StageMove,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  appAccess,
  CLOSED,
  toApplication,
  type AppRow,
} from "./application-view";
import { candidateName } from "./candidates";
import { reqRow } from "./requisitions";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

/** Appends a stage event with the next sequence number. */
export async function addStageEvent(tx: Db, companyId: string,
  e: { id: string; appId: string; stage: Stage; at: string; by: string;
    note: string | null }): Promise<void> {
  await tx.query(
    `INSERT INTO application_stage_events (id, company_id,
       application_id, seq, stage, at, by_user_id, note)
     SELECT $1, $2, $3, coalesce(max(seq), 0) + 1, $4, $5, $6, $7
     FROM application_stage_events
     WHERE company_id = $2 AND application_id = $3`,
    [e.id, companyId, e.appId, e.stage, e.at, e.by, e.note]);
}

function visibleSql(ctx: ReqCtx<unknown, ApplicationQuery>) {
  const args: unknown[] = [co(ctx)];
  const where: string[] = [];
  const role = ctx.tenant!.role;
  if (role !== "owner" && role !== "hr") {
    args.push(ctx.user!.id);
    where.push(`(r.hiring_manager_user_id = $2 OR r.requested_by = $2
      OR EXISTS (SELECT 1 FROM interviews i WHERE i.company_id =
      a.company_id AND i.application_id = a.id AND
      i.interviewer_user_ids @> jsonb_build_array($2::text)))`);
  }
  const q = ctx.query;
  if (q.requisitionId !== undefined) {
    args.push(q.requisitionId);
    where.push(`a.requisition_id = $${args.length}`);
  }
  if (q.stage !== undefined) {
    args.push(q.stage);
    where.push(`a.stage = $${args.length}`);
  }
  return { sql: where.map((w) => ` AND ${w}`).join(""), args };
}

export async function listApplications(
  ctx: ReqCtx<unknown, ApplicationQuery>) {
  const f = visibleSql(ctx);
  const rows = await ctx.tx.query<{ id: string }>(
    `SELECT a.id FROM applications a JOIN requisitions r ON
       r.company_id = a.company_id AND r.id = a.requisition_id
     WHERE a.company_id = $1${f.sql} ORDER BY a.created_at, a.id`, f.args);
  const items = [];
  for (const r of rows) {
    items.push(await toApplication(ctx, await appAccess(ctx, r.id)));
  }
  return { items };
}

export async function getApplication(ctx: IdCtx) {
  return toApplication(ctx, await appAccess(ctx, ctx.params.id));
}

export async function createApplication(ctx: ReqCtx<ApplicationCreate>) {
  const req = await reqRow(ctx.tx, co(ctx), ctx.body.requisitionId);
  if (req.status !== "open") throw new ApiError("REQUISITION_NOT_OPEN");
  await candidateName(ctx, ctx.body.candidateId);
  const id = ctx.deps.newId();
  const at = ctx.deps.now().toISOString();
  const rows = await ctx.tx.query<AppRow>(
    `INSERT INTO applications (id, company_id, requisition_id,
       candidate_id, stage, created_at)
     VALUES ($1, $2, $3, $4, 'applied', $5)
     ON CONFLICT DO NOTHING RETURNING *`,
    [id, co(ctx), req.id, ctx.body.candidateId, at]);
  if (rows[0] === undefined) throw new ApiError("APPLICATION_EXISTS");
  await addStageEvent(ctx.tx, co(ctx), { id: ctx.deps.newId(), appId: id,
    stage: "applied", at, by: ctx.user!.id, note: null });
  await auditFor(ctx, "application", "application.created", id);
  return toApplication(ctx, await appAccess(ctx, id));
}

/** Sets the stage (never `hired`, which only the hire step sets). */
export async function setStage(ctx: ReqCtx, row: AppRow, to: Stage,
  note: string | null): Promise<void> {
  await ctx.tx.query(
    "UPDATE applications SET stage = $3 WHERE company_id = $1 AND id = $2",
    [co(ctx), row.id, to]);
  await addStageEvent(ctx.tx, co(ctx), { id: ctx.deps.newId(),
    appId: row.id, stage: to, at: ctx.deps.now().toISOString(),
    by: ctx.user!.id, note });
  await auditFor(ctx, "application", "application.stage-changed", row.id,
    { from: row.stage, to });
}

/** Owner, hr or the hiring manager; closed applications are 409. */
export async function moveStage(ctx: IdCtx<StageMove>) {
  const a = await appAccess(ctx, ctx.params.id, true);
  if (!a.hiringSide) throw new ApiError("FORBIDDEN");
  if (CLOSED.includes(a.row.stage)) throw new ApiError("APPLICATION_CLOSED");
  await setStage(ctx, a.row, ctx.body.stage, ctx.body.note ?? null);
  return toApplication(ctx, await appAccess(ctx, a.row.id));
}
