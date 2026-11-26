import type { Application, Interview, Stage } from "@payroll/contract";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { reqRow, type ReqRow } from "./requisitions";

export interface AppRow {
  id: string; requisition_id: string; candidate_id: string; stage: Stage;
  created_at: string;
}

export interface InterviewRow {
  id: string; application_id: string; starts_at: string; ends_at: string;
  interviewer_user_ids: string[]; location: string | null;
  status: "scheduled" | "cancelled";
  calendar_status: Interview["calendar"]["status"];
  calendar_ref: string | null;
}

/** An application with what decides who may see and act on it. */
export interface AppAccess {
  row: AppRow;
  req: ReqRow;
  /** Owner, hr or the requisition's hiring manager. */
  hiringSide: boolean;
  /** Listed on one of the application's interviews. */
  interviewer: boolean;
}

export const CLOSED: readonly Stage[] = ["hired", "rejected", "withdrawn"];

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

export function toInterview(r: InterviewRow): Interview {
  return { id: r.id, applicationId: r.application_id,
    startsAt: r.starts_at, endsAt: r.ends_at,
    interviewerUserIds: r.interviewer_user_ids, location: r.location,
    status: r.status, calendar: { status: r.calendar_status,
      externalRef: r.calendar_ref } };
}

async function isInterviewer(tx: Db, companyId: string, appId: string,
  userId: string): Promise<boolean> {
  const rows = await tx.query(
    `SELECT 1 FROM interviews WHERE company_id = $1 AND application_id = $2
     AND interviewer_user_ids @> jsonb_build_array($3::text)`,
    [companyId, appId, userId]);
  return rows.length > 0;
}

/** Loads an application; 404 unless the caller may see it. */
export async function appAccess(ctx: ReqCtx, id: string,
  lock = false): Promise<AppAccess> {
  const [row] = await ctx.tx.query<AppRow>(
    `SELECT * FROM applications WHERE company_id = $1 AND id = $2
     ${lock ? "FOR UPDATE" : ""}`, [co(ctx), id]);
  if (row === undefined) throw new ApiError("NOT_FOUND");
  const req = await reqRow(ctx.tx, co(ctx), row.requisition_id);
  const me = ctx.user!.id;
  const role = ctx.tenant!.role;
  const hiringSide = role === "owner" || role === "hr" ||
    req.hiring_manager_user_id === me;
  const interviewer = await isInterviewer(ctx.tx, co(ctx), id, me);
  if (!hiringSide && !interviewer && req.requested_by !== me) {
    throw new ApiError("NOT_FOUND");
  }
  return { row, req, hiringSide, interviewer };
}

async function history(ctx: ReqCtx, appId: string) {
  const rows = await ctx.tx.query<{ stage: Stage; at: string;
    by_user_id: string; note: string | null }>(
    `SELECT stage, at, by_user_id, note FROM application_stage_events
     WHERE company_id = $1 AND application_id = $2 ORDER BY seq`,
    [co(ctx), appId]);
  return rows.map((r) => ({ stage: r.stage, at: r.at, by: r.by_user_id,
    note: r.note }));
}

async function scorecards(ctx: ReqCtx, a: AppAccess) {
  const rows = await ctx.tx.query<{ id: string;
    interviewer_user_id: string; criteria: Application["scorecards"][0][
      "criteria"]; recommendation: Application["scorecards"][0][
      "recommendation"]; summary: string | null; submitted_at: string }>(
    `SELECT * FROM scorecards WHERE company_id = $1
     AND application_id = $2 ORDER BY submitted_at, id`,
    [co(ctx), a.row.id]);
  return rows.filter((r) => a.hiringSide ||
    r.interviewer_user_id === ctx.user!.id).map((r) => ({ id: r.id,
    interviewerUserId: r.interviewer_user_id, criteria: r.criteria,
    recommendation: r.recommendation, summary: r.summary,
    submittedAt: r.submitted_at }));
}

async function interviews(ctx: ReqCtx, appId: string) {
  const rows = await ctx.tx.query<InterviewRow>(
    `SELECT * FROM interviews WHERE company_id = $1
     AND application_id = $2 ORDER BY starts_at, id`, [co(ctx), appId]);
  return rows.map(toInterview);
}

/** The application's live (or hired) offer, if any. */
async function offerId(ctx: ReqCtx, appId: string) {
  const [r] = await ctx.tx.query<{ id: string }>(
    `SELECT id FROM offers WHERE company_id = $1 AND application_id = $2
     AND status IN ('pending-approval', 'approved', 'accepted', 'hired')`,
    [co(ctx), appId]);
  return r?.id ?? null;
}

export async function toApplication(ctx: ReqCtx,
  a: AppAccess): Promise<Application> {
  const [c] = await ctx.tx.query<{ full_name: string }>(
    "SELECT full_name FROM candidates WHERE company_id = $1 AND id = $2",
    [co(ctx), a.row.candidate_id]);
  return { id: a.row.id, requisitionId: a.row.requisition_id,
    candidate: { id: a.row.candidate_id, fullName: c!.full_name },
    stage: a.row.stage, history: await history(ctx, a.row.id),
    scorecards: await scorecards(ctx, a),
    interviews: await interviews(ctx, a.row.id),
    offerId: await offerId(ctx, a.row.id), createdAt: a.row.created_at };
}
