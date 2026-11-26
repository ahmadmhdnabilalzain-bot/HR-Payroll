import type {
  ApprovalTask,
  ApprovalView,
  ApproverSpec,
  Role,
  StepStatus,
  SubjectType,
} from "@payroll/contract";
import { daysBetween } from "@payroll/engine";
import { appendAudit } from "../audit/audit";
import { emitEvent } from "../channels/events";
import { eventCtx } from "../channels/notify";
import type { Db } from "../db/db";
import { parseAed } from "../db/money";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";
import { getChain } from "./chains";
import { resolveChain, type ResolvedStep } from "./resolve";
import type { SubjectHandlers } from "./subjects";

export interface RequestRow {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  status: ApprovalView["status"];
  current_step: number | null;
  submitted_by: string;
  claimant_user_id: string | null;
  claimant_employee_id: string;
  created_at: string;
}

export interface StepRow {
  step_order: number;
  approver: ApproverSpec;
  eligible: string[];
  status: StepStatus;
  decided_by: string | null;
  decided_at: string | null;
  note: string | null;
}

export const STEP_SELECT = `SELECT step_order, approver,
    array_to_json(eligible) AS eligible, status, decided_by, decided_at,
    note FROM approval_steps`;

export function handlerFor(handlers: SubjectHandlers, type: SubjectType) {
  const h = handlers.get(type);
  if (h === undefined) throw new ApiError("NOT_FOUND");
  return h;
}

export async function loadRequest(tx: Db, companyId: string, id: string,
  lock = false): Promise<RequestRow> {
  const [r] = await tx.query<RequestRow>(
    `SELECT * FROM approval_requests WHERE company_id = $1 AND id = $2
     ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function loadSteps(tx: Db, companyId: string,
  requestId: string): Promise<StepRow[]> {
  return tx.query<StepRow>(`${STEP_SELECT}
    WHERE company_id = $1 AND request_id = $2 ORDER BY step_order`,
  [companyId, requestId]);
}

const toView = (r: RequestRow, steps: StepRow[]): ApprovalView => ({
  id: r.id, subjectType: r.subject_type, subjectId: r.subject_id,
  status: r.status, currentStep: r.current_step, createdAt: r.created_at,
  steps: steps.map((s) => ({ order: s.step_order, approver: s.approver,
    status: s.status, decidedBy: s.decided_by, decidedAt: s.decided_at,
    note: s.note })) });

export async function viewFor(tx: Db, companyId: string,
  approvalId: string): Promise<ApprovalView> {
  const r = await loadRequest(tx, companyId, approvalId);
  return toView(r, await loadSteps(tx, companyId, r.id));
}

async function members(tx: Db, companyId: string) {
  const rows = await tx.query<{ user_id: string; role: Role }>(
    `SELECT m.user_id, m.role FROM memberships m JOIN users u
     ON u.id = m.user_id WHERE m.company_id = $1 AND u.kind = 'human'`,
    [companyId]);
  return rows.map((m) => ({ userId: m.user_id, role: m.role }));
}

async function insertSteps(tx: Db, companyId: string, requestId: string,
  steps: ResolvedStep[]): Promise<void> {
  for (const s of steps) {
    await tx.query(
      `INSERT INTO approval_steps (company_id, request_id, step_order,
         approver, eligible, status) VALUES ($1, $2, $3, $4, $5::uuid[], $6)`,
      [companyId, requestId, s.order, JSON.stringify(s.approver),
        `{${s.eligible.join(",")}}`, s.order === 1 ? "pending" : "waiting"]);
  }
}

/**
 * Resolves the subject's chain and opens a request: step 1 pending,
 * the rest waiting. NO_ELIGIBLE_APPROVER (422) propagates.
 */
export async function openRequest(ctx: ReqCtx, handlers: SubjectHandlers,
  type: SubjectType, subjectId: string, submitterUserId: string)
  : Promise<ApprovalView> {
  const c = ctx.tenant!.companyId;
  const facts = await handlerFor(handlers, type).facts(ctx.tx, c, subjectId);
  const chain = await getChain(ctx.tx, c, type);
  const steps = resolveChain({ ...facts, submitterUserId,
    overLimitApprover: chain.overLimitApprover,
    tiers: chain.tiers.map((t) => ({ approver: t.approver,
      minTotal: parseAed(t.minTotal) })),
    members: await members(ctx.tx, c) });
  const id = ctx.deps.newId();
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO approval_requests (id, company_id, subject_type,
       subject_id, status, current_step, submitted_by, claimant_user_id,
       claimant_employee_id, created_at)
     VALUES ($1, $2, $3, $4, 'pending', 1, $5, $6, $7, $8)`,
    [id, c, type, subjectId, submitterUserId, facts.claimantUserId,
      facts.claimantEmployeeId, at]);
  await insertSteps(ctx.tx, c, id, steps);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "approval.opened", entityType: "approval", entityId: id,
    data: { subjectType: type, stepCount: steps.length } });
  await emitEvent(eventCtx(ctx), { type: "approval.pending",
    approvalId: id, stepOrder: 1, subjectType: type,
    requesterEmployeeId: facts.claimantEmployeeId });
  return viewFor(ctx.tx, c, id);
}

/** Closes an open request as cancelled (the subject was withdrawn). */
export async function cancelRequest(ctx: ReqCtx, approvalId: string)
  : Promise<void> {
  const c = ctx.tenant!.companyId;
  const r = await loadRequest(ctx.tx, c, approvalId, true);
  if (r.status !== "pending") return;
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `UPDATE approval_steps SET status = 'cancelled'
     WHERE company_id = $1 AND request_id = $2
       AND status IN ('pending', 'waiting')`, [c, r.id]);
  await ctx.tx.query(
    `UPDATE approval_requests SET status = 'cancelled', current_step = NULL,
       closed_at = $3 WHERE company_id = $1 AND id = $2`, [c, r.id, at]);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "approval.cancelled", entityType: "approval", entityId: r.id,
    data: { subjectType: r.subject_type } });
}

interface TaskRow extends RequestRow {
  step_order: number;
  step_count: number;
}

/** Pending steps the caller may decide, oldest first. */
export async function inbox(ctx: ReqCtx, handlers: SubjectHandlers)
  : Promise<ApprovalTask[]> {
  const c = ctx.tenant!.companyId;
  const rows = await ctx.tx.query<TaskRow>(
    `SELECT r.*, s.step_order, (SELECT count(*)::int FROM approval_steps x
       WHERE x.company_id = r.company_id AND x.request_id = r.id)
       AS step_count
     FROM approval_steps s JOIN approval_requests r
       ON r.company_id = s.company_id AND r.id = s.request_id
     WHERE s.company_id = $1 AND s.status = 'pending'
       AND r.status = 'pending' AND $2::uuid = ANY (s.eligible)
     ORDER BY r.created_at, r.id`, [c, ctx.user!.id]);
  const today = dubaiDate(ctx.deps.now());
  const out: ApprovalTask[] = [];
  for (const r of rows) {
    const facts = await handlerFor(handlers, r.subject_type)
      .facts(ctx.tx, c, r.subject_id);
    out.push({ approvalId: r.id, subjectType: r.subject_type,
      subjectId: r.subject_id, stepOrder: r.step_order,
      stepCount: r.step_count, submittedAt: r.created_at,
      ageDays: ageDays(r.created_at, today), summary: facts.summary });
  }
  return out;
}

/** Whole Dubai calendar days from `at` to `today` (never negative). */
export function ageDays(at: string, today: string): number {
  return Math.max(0, daysBetween(dubaiDate(new Date(at)), today));
}

