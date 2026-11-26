import type {
  AttendanceCorrection,
  AttendanceQuery,
  ClockBody,
} from "@payroll/contract";
import {
  clockIn,
  clockOut,
  correctAttendance,
  toRecord,
  type AttendanceRow,
} from "../attendance/attendance";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { inScope, viewerScope } from "../people/redact";
import { clockFacts } from "../time/clock-geofence";

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

/** HR correction (Plan 3), now refused on a locked day. */
async function fix(ctx: ReqCtx<AttendanceCorrection, unknown,
  { id: string }>) {
  return correctAttendance(ctx, ctx.params.id, ctx.body);
}

async function inNow(ctx: ReqCtx<ClockBody | undefined>) {
  const t = ctx.tenant!;
  if (t.employeeId === null) throw new ApiError("NO_EMPLOYEE_LINK");
  const facts = await clockFacts(ctx.tx, t.companyId, t.employeeId,
    ctx.body);
  return toRecord(await clockIn(ctx.tx, t, ctx.deps.newId(),
    ctx.deps.now(), facts));
}

export function registerAttendanceRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "clockIn", inNow);
  register(app, deps, "clockOut", async (ctx) => toRecord(await clockOut(
    ctx.tx, ctx.tenant!, ctx.deps.now())));
  register(app, deps, "listAttendance", list);
  register(app, deps, "correctAttendance", fix);
}
