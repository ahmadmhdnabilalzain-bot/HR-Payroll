import type {
  OvertimeDecisionInput,
  TimesheetPrepare,
  TimesheetQuery,
} from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, Reply, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeRef } from "../leave/requests";
import { inScope, viewerScope } from "../people/redact";
import { audit, co, nowIso } from "../time/ctx";
import { assertTimeDecidable } from "../time/decide";
import { dubaiDate } from "../time/dubai";
import {
  checkDecisions,
  misfits,
  saveDecisions,
  undecided,
  voidDecisions,
} from "../time/overtime-decisions";
import { buildPayInputs } from "../time/pay-inputs";
import { loadPayInputSource } from "../time/pay-inputs-load";
import { monthBounds } from "../time/timesheet-build";
import {
  freeze,
  loadSheet,
  rebuild,
  sheetView,
  visibleSheet,
  type SheetRow,
} from "../time/timesheets";
import { sheetWfh } from "../time/sheet-wfh";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;
const today = (ctx: ReqCtx) => dubaiDate(ctx.deps.now());
const view = (ctx: ReqCtx, r: SheetRow) =>
  sheetView(ctx.tx, co(ctx), r, today(ctx), sheetWfh);
const reread = async (ctx: ReqCtx, id: string) =>
  view(ctx, await loadSheet(ctx.tx, co(ctx), id));

async function prepare(ctx: ReqCtx<TimesheetPrepare>) {
  const t = ctx.tenant!;
  const emp = ctx.body.employeeId ?? t.employeeId;
  if (emp === null) throw new ApiError("NO_EMPLOYEE_LINK");
  const payroll = t.role === "owner" || t.role === "hr";
  if (emp !== t.employeeId && !payroll) throw new ApiError("FORBIDDEN");
  await employeeRef(ctx.tx, co(ctx), emp);
  const made = await ctx.tx.query<{ id: string }>(
    `INSERT INTO timesheets (id, company_id, employee_id, year, month,
       status, created_at) VALUES ($1, $2, $3, $4, $5, 'draft', $6)
     ON CONFLICT (company_id, employee_id, year, month) DO NOTHING
     RETURNING id`, [ctx.deps.newId(), co(ctx), emp, ctx.body.year,
      ctx.body.month, nowIso(ctx)]);
  const [row] = await ctx.tx.query<SheetRow>(
    `SELECT * FROM timesheets WHERE company_id = $1 AND employee_id = $2
     AND year = $3 AND month = $4`, [co(ctx), emp, ctx.body.year,
      ctx.body.month]);
  if (made.length === 0) return new Reply(200, await view(ctx, row!));
  await audit(ctx, "timesheet.prepared", "timesheet", row!.id,
    { employeeId: emp });
  return view(ctx, row!);
}

async function setStatus(ctx: ReqCtx, r: SheetRow, status: string,
  action: string, extra = "") {
  await ctx.tx.query(`UPDATE timesheets SET status = $3 ${extra}
    WHERE company_id = $1 AND id = $2`, [co(ctx), r.id, status]);
  await audit(ctx, `timesheet.${action}`, "timesheet", r.id,
    { employeeId: r.employee_id });
  return reread(ctx, r.id);
}

/** Self, owner or hr, after the month has ended; freezes the days. */
async function submit(ctx: IdCtx) {
  const t = ctx.tenant!;
  const r = await visibleSheet(ctx.tx, t, ctx.params.id, true);
  const self = r.employee_id === t.employeeId;
  if (!self && t.role !== "owner" && t.role !== "hr") {
    throw new ApiError("FORBIDDEN");
  }
  if (r.status !== "draft") throw new ApiError("TIMESHEET_TRANSITION");
  if (today(ctx) <= monthBounds(r.year, r.month).last) {
    throw new ApiError("PERIOD_NOT_ENDED");
  }
  const b = await rebuild(ctx.tx, co(ctx), r, today(ctx), null);
  await ctx.tx.query(
    `UPDATE timesheets SET days_json = $3, source_hash = $4,
       submitted_at = $5, submitted_by = $6 WHERE company_id = $1
       AND id = $2`, [co(ctx), r.id, JSON.stringify(freeze(b.days)),
      b.hash, nowIso(ctx), ctx.user!.id]);
  // Decisions made on the draft that no longer fit the frozen day.
  const bad = misfits(b.days);
  if (bad.length > 0) {
    await voidDecisions(ctx.tx, co(ctx), r.id, nowIso(ctx), bad);
  }
  return setStatus(ctx, r, "submitted", "submitted");
}

const decidable = (r: SheetRow) => ({ employeeIds: [r.employee_id],
  requestedByUserId: r.submitted_by ?? "", status: r.status });

async function decide(ctx: IdCtx<OvertimeDecisionInput>) {
  const r = await loadSheet(ctx.tx, co(ctx), ctx.params.id, true);
  await assertTimeDecidable(ctx, decidable(r), null, "TIMESHEET_TRANSITION");
  if (r.status === "approved") throw new ApiError("TIMESHEET_TRANSITION");
  checkDecisions((await view(ctx, r)).days, ctx.body.days);
  await saveDecisions(ctx.tx, co(ctx), r.id, ctx.body.days, ctx.user!.id,
    nowIso(ctx));
  await audit(ctx, "overtime.decided", "timesheet", r.id,
    { timesheetId: r.id, dayCount: ctx.body.days.length });
  return reread(ctx, r.id);
}

async function approve(ctx: IdCtx) {
  const r = await loadSheet(ctx.tx, co(ctx), ctx.params.id, true);
  await assertTimeDecidable(ctx, decidable(r), "submitted",
    "TIMESHEET_TRANSITION");
  const days = (await view(ctx, r)).days;
  const bad = misfits(days);
  if (bad.length > 0) {
    throw new ApiError("OVERTIME_DECISION_INVALID", undefined,
      { dates: bad });
  }
  const open = undecided(days);
  if (open.length > 0) {
    throw new ApiError("OVERTIME_UNDECIDED", undefined, { dates: open });
  }
  await ctx.tx.query("UPDATE timesheets SET approved_at = $3, approved_by " +
    "= $4 WHERE company_id = $1 AND id = $2", [co(ctx), r.id, nowIso(ctx),
    ctx.user!.id]);
  return setStatus(ctx, r, "approved", "approved");
}

/** Reject (submitted) or reopen (approved) back to draft. */
function back(from: "submitted" | "approved", action: string) {
  return async (ctx: IdCtx<{ note: string }>) => {
    const r = await loadSheet(ctx.tx, co(ctx), ctx.params.id, true);
    await assertTimeDecidable(ctx, decidable(r), from,
      "TIMESHEET_TRANSITION");
    await voidDecisions(ctx.tx, co(ctx), r.id, nowIso(ctx), null);
    return setStatus(ctx, r, "draft", action, ", days_json = NULL, " +
      "source_hash = NULL, approved_at = NULL, approved_by = NULL");
  };
}

async function list(ctx: ReqCtx<unknown, TimesheetQuery>) {
  const q = ctx.query;
  const rows = await ctx.tx.query<SheetRow & { manager_id: string | null }>(
    `SELECT s.*, e.manager_id FROM timesheets s JOIN employees e
       ON e.company_id = s.company_id AND e.id = s.employee_id
     WHERE s.company_id = $1 AND s.year = $2 AND s.month = $3
       AND ($4::uuid IS NULL OR s.employee_id = $4)
       AND ($5::text IS NULL OR s.status = $5) ORDER BY s.employee_id`,
    [co(ctx), q.year, q.month, q.employeeId ?? null, q.status ?? null]);
  const scope = viewerScope(ctx.tenant!);
  const items = [];
  for (const r of rows.filter((x) => inScope(scope, { id: x.employee_id,
    managerId: x.manager_id }))) {
    const { days: _d, ...summary } = await view(ctx, r);
    items.push(summary);
  }
  return { items };
}

async function payInputs(ctx: ReqCtx<unknown, { year: number;
  month: number }>) {
  const { year, month } = ctx.query;
  const out = buildPayInputs(await loadPayInputSource(ctx.tx, co(ctx),
    year, month, today(ctx)));
  await audit(ctx, "payinputs.viewed", "pay-inputs", null, { year, month,
    employeeCount: out.employees.length });
  return out;
}

export function registerTimesheetRoutes(app: App, deps: AppDeps) {
  register(app, deps, "listTimesheets", list);
  register(app, deps, "getTimesheet", async (ctx: IdCtx) => view(ctx,
    await visibleSheet(ctx.tx, ctx.tenant!, ctx.params.id)));
  register(app, deps, "prepareTimesheet", prepare);
  register(app, deps, "submitTimesheet", submit);
  register(app, deps, "decideOvertime", decide);
  register(app, deps, "approveTimesheet", approve);
  register(app, deps, "rejectTimesheet", back("submitted", "rejected"));
  register(app, deps, "reopenTimesheet", back("approved", "reopened"));
  register(app, deps, "getPayInputs", payInputs);
}
