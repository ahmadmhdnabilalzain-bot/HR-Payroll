import type { InterviewCreate } from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import type { CalendarEvent } from "../ports/calendar";
import { memberRole } from "../tasks/tasks";
import {
  appAccess,
  CLOSED,
  toApplication,
  toInterview,
  type InterviewRow,
} from "./application-view";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

/** Interviewers: members with role owner, hr or manager (422). */
async function checkInterviewers(ctx: ReqCtx, ids: string[]) {
  for (const id of ids) {
    const role = await memberRole(ctx.tx, co(ctx), id);
    if (role === null || role === "employee") {
      throw new ApiError("INTERVIEWER_ROLE", undefined,
        { fields: ["body.interviewerUserIds"] });
    }
  }
}

/** A throwing port is recorded as `failed`; the interview is kept. */
async function propose(ctx: ReqCtx, e: CalendarEvent) {
  try {
    const r = await ctx.deps.calendar.proposeEvent(e);
    return r.status === "sent" ? { status: "sent", ref: r.externalRef }
      : { status: "not-connected", ref: null };
  } catch {
    return { status: "failed", ref: null };
  }
}

export async function scheduleInterview(ctx: IdCtx<InterviewCreate>) {
  const a = await appAccess(ctx, ctx.params.id);
  if (!a.hiringSide) throw new ApiError("FORBIDDEN");
  if (CLOSED.includes(a.row.stage)) throw new ApiError("APPLICATION_CLOSED");
  const b = ctx.body;
  if (Date.parse(b.endsAt) <= Date.parse(b.startsAt)) {
    throw new ApiError("INTERVIEW_TIMES");
  }
  const ids = [...new Set(b.interviewerUserIds)];
  await checkInterviewers(ctx, ids);
  const id = ctx.deps.newId();
  const cal = await propose(ctx, { companyId: co(ctx), interviewId: id,
    startsAt: b.startsAt, endsAt: b.endsAt, attendeeUserIds: ids,
    title: `Interview: ${a.req.title}` });
  await ctx.tx.query(
    `INSERT INTO interviews (id, company_id, application_id, starts_at,
       ends_at, interviewer_user_ids, location, status, calendar_status,
       calendar_ref, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8, $9, $10, $11)`,
    [id, co(ctx), a.row.id, b.startsAt, b.endsAt, JSON.stringify(ids),
      b.location ?? null, cal.status, cal.ref, ctx.user!.id,
      ctx.deps.now().toISOString()]);
  await auditFor(ctx, "interview", "interview.scheduled", id,
    { status: cal.status });
  return toApplication(ctx, await appAccess(ctx, a.row.id));
}

/** Owner, hr or the hiring manager. Cancelling twice is a no-op. */
export async function cancelInterview(ctx: IdCtx) {
  const [iv] = await ctx.tx.query<InterviewRow>(
    "SELECT * FROM interviews WHERE company_id = $1 AND id = $2",
    [co(ctx), ctx.params.id]);
  if (iv === undefined) throw new ApiError("NOT_FOUND");
  const a = await appAccess(ctx, iv.application_id);
  if (!a.hiringSide) throw new ApiError("FORBIDDEN");
  if (iv.status === "cancelled") return toInterview(iv);
  await ctx.tx.query(
    `UPDATE interviews SET status = 'cancelled' WHERE company_id = $1
     AND id = $2`, [co(ctx), iv.id]);
  await auditFor(ctx, "interview", "interview.cancelled", iv.id);
  return toInterview({ ...iv, status: "cancelled" });
}
