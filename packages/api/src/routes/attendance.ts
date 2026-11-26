import type {
  AttendanceCorrection,
  AttendanceQuery,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import {
  clockIn,
  clockOut,
  correct,
  loadRecord,
  toRecord,
  type AttendanceRow,
} from "../attendance/attendance";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { inScope, viewerScope } from "../people/redact";

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

async function list(ctx: ReqCtx<unknown, AttendanceQuery>) {
  const q = ctx.query;
  if (q.to < q.from) {
    throw new ApiError("VALIDATION_FAILED", "to is before from",
      { fields: ["query.to"] });
  }
  const rows = await ctx.tx.query<AttendanceRow & { manager_id: string |
    null }>(
    `SELECT a.*, e.manager_id FROM attendance a
     JOIN employees e ON e.company_id = a.company_id AND e.id = a.employee_id
     WHERE a.company_id = $1 AND a.date BETWEEN $2 AND $3
       AND ($4::uuid IS NULL OR a.employee_id = $4)
     ORDER BY a.date, a.clock_in, a.id`,
    [co(ctx), q.from, q.to, q.employeeId ?? null]);
  const scope = viewerScope(ctx.tenant!);
  return { items: rows.filter((r) => inScope(scope,
    { id: r.employee_id, managerId: r.manager_id })).map(toRecord) };
}

/** HR correction; the audit row keeps the old and new times. */
async function fix(ctx: ReqCtx<AttendanceCorrection, unknown,
  { id: string }>) {
  const old = await loadRecord(ctx.tx, co(ctx), ctx.params.id);
  const r = await correct(ctx.tx, co(ctx), old.id, ctx.body);
  const data: Record<string, string> = { oldClockIn: old.clock_in,
    newClockIn: r.clock_in };
  if (old.clock_out !== null) data.oldClockOut = old.clock_out;
  if (r.clock_out !== null) data.newClockOut = r.clock_out;
  await appendAudit(ctx.tx, { companyId: co(ctx),
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "attendance.corrected", entityType: "attendance",
    entityId: r.id, data });
  return toRecord(r);
}

export function registerAttendanceRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "clockIn", async (ctx) => toRecord(await clockIn(
    ctx.tx, ctx.tenant!, ctx.deps.newId(), ctx.deps.now())));
  register(app, deps, "clockOut", async (ctx) => toRecord(await clockOut(
    ctx.tx, ctx.tenant!, ctx.deps.now())));
  register(app, deps, "listAttendance", list);
  register(app, deps, "correctAttendance", fix);
}
