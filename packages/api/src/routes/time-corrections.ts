import type {
  CorrectionCreate,
  CorrectionQuery,
} from "@payroll/contract";
import { correctAttendance, minutesBetween } from "../attendance/attendance";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { inScope, viewerScope } from "../people/redact";
import {
  assertNoOverlap,
  checkCorrection,
  loadCorrection,
  toCorrection,
  type CorrectionRow,
} from "../time/corrections";
import { audit, co, nowIso, selfEmployee } from "../time/ctx";
import { assertTimeDecidable } from "../time/decide";
import { assertUnlocked } from "../time/locks";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

async function create(ctx: ReqCtx<CorrectionCreate>) {
  const me = selfEmployee(ctx);
  const b = ctx.body;
  if (b.employeeId !== undefined && b.employeeId !== me) {
    throw new ApiError("FORBIDDEN");
  }
  await ctx.tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [co(ctx), me]);
  await checkCorrection(ctx.tx, co(ctx), me, b);
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO attendance_corrections (id, company_id, employee_id,
       attendance_id, date, clock_in, clock_out, reason, status,
       requested_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)`,
    [id, co(ctx), me, b.attendanceId ?? null, b.date, b.clockIn,
      b.clockOut, b.reason, ctx.user!.id, nowIso(ctx)]);
  await audit(ctx, "correction.requested", "correction", id,
    { date: b.date });
  return toCorrection(await loadCorrection(ctx.tx, co(ctx), id));
}

async function setStatus(ctx: ReqCtx, r: CorrectionRow, status: string,
  note: string | null) {
  await ctx.tx.query(
    `UPDATE attendance_corrections SET status = $3, decided_by = $4,
       decided_at = $5, decision_note = $6 WHERE company_id = $1 AND id = $2`,
    [co(ctx), r.id, status, ctx.user!.id, nowIso(ctx), note]);
  return toCorrection(await loadCorrection(ctx.tx, co(ctx), r.id));
}

/** Writes the corrected record: update through Plan 3, else insert. */
async function apply(ctx: ReqCtx, r: CorrectionRow): Promise<string> {
  await assertUnlocked(ctx.tx, co(ctx), r.employee_id, [r.date]);
  await assertNoOverlap(ctx.tx, co(ctx), r.employee_id, { date: r.date,
    clockIn: r.clock_in, clockOut: r.clock_out,
    attendanceId: r.attendance_id });
  const note = "correction request approved";
  if (r.attendance_id !== null) {
    await correctAttendance(ctx, r.attendance_id, { clockIn: r.clock_in,
      clockOut: r.clock_out, note }, "correction");
    return r.attendance_id;
  }
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO attendance (id, company_id, employee_id, date, clock_in,
       clock_out, minutes, source, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'correction', $8, $9)`,
    [id, co(ctx), r.employee_id, r.date, r.clock_in, r.clock_out,
      minutesBetween(r.clock_in, r.clock_out!), note, nowIso(ctx)]);
  return id;
}

function decider(to: "approved" | "rejected") {
  return async (ctx: IdCtx<{ note?: string } | undefined>) => {
    const r = await loadCorrection(ctx.tx, co(ctx), ctx.params.id, true);
    await assertTimeDecidable(ctx, { employeeIds: [r.employee_id],
      requestedByUserId: r.requested_by, status: r.status }, "pending",
    "CORRECTION_NOT_PENDING");
    if (to === "rejected") {
      await audit(ctx, "correction.rejected", "correction", r.id,
        { date: r.date });
      return setStatus(ctx, r, to, ctx.body?.note ?? null);
    }
    const attendanceId = await apply(ctx, r);
    await audit(ctx, "correction.approved", "correction", r.id,
      { date: r.date, attendanceId });
    return setStatus(ctx, r, to, null);
  };
}

async function cancel(ctx: IdCtx) {
  const r = await loadCorrection(ctx.tx, co(ctx), ctx.params.id, true);
  if (r.requested_by !== ctx.user!.id) throw new ApiError("NOT_FOUND");
  if (r.status !== "pending") throw new ApiError("CORRECTION_NOT_PENDING");
  await audit(ctx, "correction.cancelled", "correction", r.id,
    { date: r.date });
  return setStatus(ctx, r, "cancelled", null);
}

async function list(ctx: ReqCtx<unknown, CorrectionQuery>) {
  const rows = await ctx.tx.query<CorrectionRow & { manager_id: string |
    null }>(
    `SELECT c.*, e.manager_id FROM attendance_corrections c
     JOIN employees e ON e.company_id = c.company_id AND e.id = c.employee_id
     WHERE c.company_id = $1 AND ($2::uuid IS NULL OR c.employee_id = $2)
       AND ($3::text IS NULL OR c.status = $3) ORDER BY c.date, c.id`,
    [co(ctx), ctx.query.employeeId ?? null, ctx.query.status ?? null]);
  const scope = viewerScope(ctx.tenant!);
  return { items: rows.filter((r) => inScope(scope, { id: r.employee_id,
    managerId: r.manager_id })).map(toCorrection) };
}

export function registerTimeCorrectionRoutes(app: App, deps: AppDeps) {
  register(app, deps, "listCorrectionRequests", list);
  register(app, deps, "createCorrectionRequest", create);
  register(app, deps, "approveCorrectionRequest", decider("approved"));
  register(app, deps, "rejectCorrectionRequest", decider("rejected"));
  register(app, deps, "cancelCorrectionRequest", cancel);
}
