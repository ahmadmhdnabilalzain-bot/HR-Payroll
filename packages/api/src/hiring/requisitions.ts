import type {
  Decision,
  Requisition,
  RequisitionClose,
  RequisitionCreate,
  RequisitionStatus,
} from "@payroll/contract";
import { assertDecidable } from "../approvals/decide";
import { auditFor } from "../audit/hr-audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { memberRole } from "../tasks/tasks";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

export interface ReqRow {
  id: string; title: string; title_ar: string | null;
  department_id: string | null; hiring_manager_user_id: string | null;
  headcount: number; hired_count: number; status: RequisitionStatus;
  reason: string | null; requested_by: string; decided_by: string | null;
  decided_at: string | null; decision_note: string | null;
  created_at: string;
}

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;
const payroll = (ctx: ReqCtx) =>
  ctx.tenant!.role === "owner" || ctx.tenant!.role === "hr";

export function toRequisition(r: ReqRow): Requisition {
  return { id: r.id, title: r.title, titleAr: r.title_ar,
    departmentId: r.department_id,
    hiringManagerUserId: r.hiring_manager_user_id, headcount: r.headcount,
    hiredCount: r.hired_count, status: r.status, reason: r.reason,
    requestedBy: r.requested_by, decidedBy: r.decided_by,
    decidedAt: r.decided_at, decisionNote: r.decision_note,
    createdAt: r.created_at };
}

/** Owner and hr: all; others what they requested or hire for. */
export function canSeeRequisition(ctx: ReqCtx, r: ReqRow): boolean {
  const me = ctx.user!.id;
  return payroll(ctx) || r.requested_by === me ||
    r.hiring_manager_user_id === me;
}

export async function reqRow(tx: Db, companyId: string,
  id: string): Promise<ReqRow> {
  const [r] = await tx.query<ReqRow>(
    "SELECT * FROM requisitions WHERE company_id = $1 AND id = $2",
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function visibleRequisition(ctx: IdCtx): Promise<ReqRow> {
  const r = await reqRow(ctx.tx, co(ctx), ctx.params.id);
  if (!canSeeRequisition(ctx, r)) throw new ApiError("NOT_FOUND");
  return r;
}

export async function listRequisitions(ctx: ReqCtx) {
  const rows = await ctx.tx.query<ReqRow>(
    `SELECT * FROM requisitions WHERE company_id = $1
     ORDER BY created_at DESC, id`, [co(ctx)]);
  return { items: rows.filter((r) => canSeeRequisition(ctx, r))
    .map(toRequisition) };
}

async function hiringManager(ctx: ReqCtx<RequisitionCreate>) {
  const asked = ctx.body.hiringManagerUserId;
  if (ctx.tenant!.role === "manager") {
    if (asked !== undefined && asked !== ctx.user!.id) {
      throw new ApiError("FORBIDDEN");
    }
    return ctx.user!.id;
  }
  if (asked === undefined) return null;
  const role = await memberRole(ctx.tx, co(ctx), asked);
  if (role === null || role === "employee") {
    throw new ApiError("ASSIGNEE_NOT_MEMBER", "The hiring manager must " +
      "be a member with role owner, hr or manager");
  }
  return asked;
}

async function checkDepartment(ctx: ReqCtx, id: string | undefined) {
  if (id === undefined) return;
  const rows = await ctx.tx.query(
    "SELECT 1 FROM departments WHERE company_id = $1 AND id = $2",
    [co(ctx), id]);
  if (rows.length === 0) {
    throw new ApiError("NOT_FOUND", "No such department",
      { fields: ["body.departmentId"] });
  }
}

export async function createRequisition(ctx: ReqCtx<RequisitionCreate>) {
  const b = ctx.body;
  const hm = await hiringManager(ctx);
  await checkDepartment(ctx, b.departmentId);
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO requisitions (id, company_id, title, title_ar,
       department_id, hiring_manager_user_id, headcount, status, reason,
       requested_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending-approval', $8, $9, $10)`,
    [id, co(ctx), b.title, b.titleAr ?? null, b.departmentId ?? null, hm,
      b.headcount, b.reason ?? null, ctx.user!.id,
      ctx.deps.now().toISOString()]);
  await auditFor(ctx, "requisition", "requisition.created", id);
  return toRequisition(await reqRow(ctx.tx, co(ctx), id));
}

export async function decideRequisition(ctx: IdCtx<Decision>) {
  const r = await visibleRequisition(ctx);
  assertDecidable(ctx, { status: r.status, requestedBy: r.requested_by },
    { pending: "pending-approval", roles: ["owner", "hr"] });
  const status = ctx.body.approve ? "open" : "rejected";
  await ctx.tx.query(
    `UPDATE requisitions SET status = $3, decided_by = $4, decided_at = $5,
       decision_note = $6 WHERE company_id = $1 AND id = $2`,
    [co(ctx), r.id, status, ctx.user!.id, ctx.deps.now().toISOString(),
      ctx.body.note ?? null]);
  await auditFor(ctx, "requisition", ctx.body.approve
    ? "requisition.approved" : "requisition.rejected", r.id);
  return toRequisition(await reqRow(ctx.tx, co(ctx), r.id));
}

/** Requester, owner or hr; from pending or open only. */
export async function closeRequisition(ctx: IdCtx<RequisitionClose>) {
  const r = await visibleRequisition(ctx);
  if (!payroll(ctx) && r.requested_by !== ctx.user!.id) {
    throw new ApiError("FORBIDDEN");
  }
  if (r.status !== "pending-approval" && r.status !== "open") {
    throw new ApiError("REQUISITION_NOT_OPEN");
  }
  await ctx.tx.query(
    `UPDATE requisitions SET status = 'cancelled', close_reason = $3
     WHERE company_id = $1 AND id = $2`,
    [co(ctx), r.id, ctx.body.reason]);
  await auditFor(ctx, "requisition", "requisition.cancelled", r.id);
  return toRequisition(await reqRow(ctx.tx, co(ctx), r.id));
}
