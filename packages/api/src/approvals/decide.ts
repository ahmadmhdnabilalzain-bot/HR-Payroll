import type {
  ApprovalDecision,
  ApprovalView,
  ErrorCode,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { emitEvent } from "../channels/events";
import { eventCtx } from "../channels/notify";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  handlerFor,
  loadRequest,
  loadSteps,
  viewFor,
  type RequestRow,
  type StepRow,
} from "./requests";
import { mayDecide } from "./resolve";
import {
  linkedUsers,
  type Outcome,
  type SubjectHandlers,
} from "./subjects";

export type Action = "approve" | "reject" | "return";

const CLOSED = { reject: "rejected", return: "returned" } as const;

/** A caller who may not see the subject and is no approver: 404. */
async function checkVisible(ctx: ReqCtx, handlers: SubjectHandlers,
  r: RequestRow, steps: StepRow[]): Promise<void> {
  const me = ctx.user!.id;
  if (steps.some((s) => s.eligible.includes(me))) return;
  const h = handlerFor(handlers, r.subject_type);
  if (!(await h.canView(ctx, r.subject_id))) throw new ApiError("NOT_FOUND");
}

/**
 * Separation of duties at decision time: the claimant (as stored and
 * every user linked to the claimant employee now), the submitter and
 * the approvers of earlier steps may not decide.
 */
async function checkActor(ctx: ReqCtx, r: RequestRow, steps: StepRow[])
  : Promise<void> {
  const linked = await linkedUsers(ctx.tx, ctx.tenant!.companyId,
    r.claimant_employee_id);
  const excluded = [r.submitted_by, ...linked];
  if (r.claimant_user_id !== null) excluded.push(r.claimant_user_id);
  const prior = steps.filter((s) => s.status === "approved")
    .map((s) => s.decided_by!);
  const verdict = mayDecide(steps.map((s) => ({ order: s.step_order,
    approver: s.approver, eligible: s.eligible })), r.current_step!,
  ctx.user!.id, prior, excluded);
  if (verdict !== "ok") throw new ApiError(verdict as ErrorCode);
}

async function markStep(ctx: ReqCtx, r: RequestRow, status: string,
  note: string | null, at: string): Promise<void> {
  const done = await ctx.tx.query(
    `UPDATE approval_steps SET status = $4, decided_by = $5,
       decided_at = $6, note = $7
     WHERE company_id = $1 AND request_id = $2 AND step_order = $3
       AND status = 'pending' RETURNING step_order`,
    [ctx.tenant!.companyId, r.id, r.current_step, status, ctx.user!.id,
      at, note]);
  if (done.length !== 1) throw new ApiError("APPROVAL_STEP_CHANGED");
}

async function advance(ctx: ReqCtx, r: RequestRow, steps: StepRow[],
  at: string): Promise<"approved" | null> {
  const c = ctx.tenant!.companyId;
  const next = steps.find((s) => s.step_order === r.current_step! + 1);
  if (next !== undefined) {
    await ctx.tx.query(
      `UPDATE approval_steps SET status = 'pending' WHERE company_id = $1
         AND request_id = $2 AND step_order = $3 AND status = 'waiting'`,
      [c, r.id, next.step_order]);
    await ctx.tx.query(
      `UPDATE approval_requests SET current_step = $3
       WHERE company_id = $1 AND id = $2`, [c, r.id, next.step_order]);
    return null;
  }
  await close(ctx, r, "approved", at);
  return "approved";
}

async function close(ctx: ReqCtx, r: RequestRow, status: string,
  at: string): Promise<void> {
  const c = ctx.tenant!.companyId;
  await ctx.tx.query(
    `UPDATE approval_steps SET status = 'cancelled' WHERE company_id = $1
       AND request_id = $2 AND status = 'waiting'`, [c, r.id]);
  await ctx.tx.query(
    `UPDATE approval_requests SET status = $3, current_step = NULL,
       closed_at = $4 WHERE company_id = $1 AND id = $2`,
    [c, r.id, status, at]);
}

function auditAction(action: Action): string {
  return action === "approve" ? "approval.step-approved"
    : `approval.${CLOSED[action]}`;
}

/**
 * One decision on the current step. The request row is locked first,
 * so two approvers clicking at once are serialised: the second sees
 * the step moved (409 APPROVAL_STEP_CHANGED) or the request closed
 * (409 APPROVAL_NOT_PENDING).
 */
export async function decide(ctx: ReqCtx<ApprovalDecision>,
  handlers: SubjectHandlers, approvalId: string, action: Action)
  : Promise<ApprovalView> {
  const c = ctx.tenant!.companyId;
  const r = await loadRequest(ctx.tx, c, approvalId, true);
  const steps = await loadSteps(ctx.tx, c, r.id);
  await checkVisible(ctx, handlers, r, steps);
  if (r.status !== "pending") throw new ApiError("APPROVAL_NOT_PENDING");
  if (ctx.body.stepOrder !== r.current_step) {
    throw new ApiError("APPROVAL_STEP_CHANGED");
  }
  await checkActor(ctx, r, steps);
  const at = ctx.deps.now().toISOString();
  const status = action === "approve" ? "approved" : CLOSED[action];
  await markStep(ctx, r, status, ctx.body.note ?? null, at);
  let closed: Outcome | null = null;
  if (action === "approve") closed = await advance(ctx, r, steps, at);
  else {
    await close(ctx, r, status, at);
    closed = CLOSED[action];
  }
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: auditAction(action), entityType: "approval", entityId: r.id,
    data: { subjectType: r.subject_type, stepOrder: r.current_step! } });
  if (closed !== null) {
    await handlerFor(handlers, r.subject_type).onClosed(ctx, r.subject_id,
      closed);
  }
  await emitDecision(ctx, r, closed);
  return viewFor(ctx.tx, c, r.id);
}

/** The claimant hears of a close; the next step's approvers of a move. */
async function emitDecision(ctx: ReqCtx, r: RequestRow,
  closed: Outcome | null): Promise<void> {
  await emitEvent(eventCtx(ctx), closed === null
    ? { type: "approval.pending", approvalId: r.id,
      stepOrder: r.current_step! + 1, subjectType: r.subject_type,
      requesterEmployeeId: r.claimant_employee_id }
    : { type: "approval.closed", approvalId: r.id,
      subjectType: r.subject_type, subjectId: r.subject_id,
      outcome: closed, claimantUserId: r.claimant_user_id });
}
