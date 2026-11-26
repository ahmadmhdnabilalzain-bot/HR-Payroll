import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeRef } from "../leave/requests";
import { inScope, viewerScope } from "../people/redact";
import {
  departmentDays,
  loadPeople,
  staffingMinimums,
} from "../time/availability";
import { audit, co, nowIso } from "../time/ctx";
import { dubaiDate } from "../time/dubai";
import { computeAttendanceFlags } from "../time/flags";
import { loadFlagDays } from "../time/flags-load";
import { assertRange } from "../time/range";
import { getTimeSettings } from "../time/settings";
import { teamCalendar } from "../time/team-calendar";

type Range = { from: string; to: string; departmentId?: string };

async function calendar(ctx: ReqCtx<unknown, Range>) {
  assertRange(ctx.query.from, ctx.query.to);
  return { items: await teamCalendar(ctx.tx, ctx.tenant!, ctx.query.from,
    ctx.query.to, ctx.query.departmentId) };
}

/** Counts only. Owner and hr: every department; others: their own. */
async function availability(ctx: ReqCtx<unknown, Range>) {
  const q = ctx.query;
  assertRange(q.from, q.to);
  const t = ctx.tenant!;
  const people = await loadPeople(ctx.tx, co(ctx));
  const mine = people.find((p) => p.id === t.employeeId)?.department_id;
  const all = t.role === "owner" || t.role === "hr";
  const dept = q.departmentId ?? (all ? undefined : mine ?? "none");
  if (!all && dept !== mine) return { items: [] };
  const group = people.filter((p) => dept === undefined ||
    p.department_id === dept);
  const mins = await staffingMinimums(ctx.tx, co(ctx));
  const days = await departmentDays(ctx.tx, co(ctx), group, q.from, q.to);
  return { items: days.map((d) => {
    const available = d.scheduled.length - d.onLeave.length;
    const minOnDuty = mins.get(d.departmentId) ?? null;
    return { date: d.date, departmentId: d.departmentId,
      scheduled: d.scheduled.length, onLeave: d.onLeave.length, available,
      minOnDuty, belowMinimum: minOnDuty !== null && available < minOnDuty };
  }) };
}

async function staffing(ctx: ReqCtx<{ minOnDuty: number | null },
  unknown, { id: string }>) {
  const [d] = await ctx.tx.query("SELECT 1 FROM departments WHERE " +
    "company_id = $1 AND id = $2", [co(ctx), ctx.params.id]);
  if (d === undefined) throw new ApiError("NOT_FOUND");
  await ctx.tx.query(
    `INSERT INTO department_staffing (company_id, department_id,
       min_on_duty, updated_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (department_id) DO UPDATE SET min_on_duty = $3,
       updated_at = $4`,
    [co(ctx), ctx.params.id, ctx.body.minOnDuty, nowIso(ctx)]);
  await audit(ctx, "staffing.updated", "department", ctx.params.id);
  return { departmentId: ctx.params.id, minOnDuty: ctx.body.minOnDuty };
}

/** Self; a manager's reports; everyone for hr and owner; else 404. */
async function flagTargets(ctx: ReqCtx, one: string | undefined) {
  const scope = viewerScope(ctx.tenant!);
  if (one !== undefined) {
    const ref = await employeeRef(ctx.tx, co(ctx), one);
    if (!inScope(scope, ref)) throw new ApiError("NOT_FOUND");
    return [ref.id];
  }
  return (await loadPeople(ctx.tx, co(ctx))).filter((p) => inScope(scope,
    { id: p.id, managerId: p.manager_id })).map((p) => p.id);
}

async function flags(ctx: ReqCtx<unknown, Range & { employeeId?:
  string }>) {
  const q = ctx.query;
  assertRange(q.from, q.to);
  const t = await getTimeSettings(ctx.tx, co(ctx));
  const today = dubaiDate(ctx.deps.now());
  const items = [];
  for (const emp of await flagTargets(ctx, q.employeeId)) {
    const days = await loadFlagDays(ctx.tx, co(ctx), emp, q.from, q.to,
      today);
    items.push(...computeAttendanceFlags(emp, days, t, q));
  }
  return { items };
}

export function registerTimeCalendarRoutes(app: App, deps: AppDeps) {
  register(app, deps, "getLeaveCalendar", calendar);
  register(app, deps, "getTeamAvailability", availability);
  register(app, deps, "putStaffingMinimum", staffing);
  register(app, deps, "listAttendanceFlags", flags);
}
