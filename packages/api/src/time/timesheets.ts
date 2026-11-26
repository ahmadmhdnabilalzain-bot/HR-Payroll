import type {
  OvertimeDecision,
  Timesheet,
  TimesheetDay,
  TimesheetStatus,
} from "@payroll/contract";
import { periodHourFlags } from "@payroll/engine";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { employeeRef } from "../leave/requests";
import { inScope, viewerScope } from "../people/redact";
import { timeParams } from "./params";
import {
  buildDayInputs,
  buildTimesheetDays,
  monthBounds,
  sourceHash,
  type WfhLite,
} from "./timesheet-build";

export interface SheetRow { id: string; employee_id: string; year: number;
  month: number; status: TimesheetStatus;
  days_json: TimesheetDay[] | null; source_hash: string | null;
  submitted_at: string | null; submitted_by: string | null;
  approved_at: string | null; approved_by: string | null }

/** WFH day totals for a sheet (Task 10 plugs this in); none by default. */
export type WfhSource = (tx: Db, companyId: string, employeeId: string,
  from: string, to: string) => Promise<Map<string, WfhLite> | null>;

export async function loadSheet(tx: Db, companyId: string, id: string,
  lock = false): Promise<SheetRow> {
  const [r] = await tx.query<SheetRow>(
    `SELECT * FROM timesheets WHERE company_id = $1 AND id = $2
     ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** The employee, their manager, hr and owner; others 404. */
export async function visibleSheet(tx: Db, t: Tenant, id: string,
  lock = false): Promise<SheetRow> {
  const r = await loadSheet(tx, t.companyId, id, lock);
  const ref = await employeeRef(tx, t.companyId, r.employee_id);
  if (!inScope(viewerScope(t), ref)) throw new ApiError("NOT_FOUND");
  return r;
}

export async function loadDecisions(tx: Db, companyId: string,
  sheetId: string): Promise<Map<string, OvertimeDecision>> {
  const rows = await tx.query<{ date: string; approved_minutes: number;
    approved_night_minutes: number; rest_day_approved: boolean | null;
    compensation: "pay" | "day-off" | null; decided_by: string;
    decided_at: string }>(
    `SELECT * FROM overtime_decisions WHERE company_id = $1
     AND timesheet_id = $2`, [companyId, sheetId]);
  return new Map(rows.map((r) => [r.date, {
    approvedMinutes: r.approved_minutes,
    approvedNightMinutes: r.approved_night_minutes,
    restDayWork: r.rest_day_approved === null ? null : {
      approved: r.rest_day_approved, compensation: r.compensation! },
    decidedBy: r.decided_by, decidedAt: r.decided_at }]));
}

export interface Built { days: TimesheetDay[]; hash: string }

/** The days as of now (a draft's days) and their source hash. */
export async function rebuild(tx: Db, companyId: string, r: SheetRow,
  today: string, wfh: WfhSource | null): Promise<Built> {
  const built = await buildDayInputs(tx, companyId, r.employee_id, r.year,
    r.month, today);
  const { first, last } = monthBounds(r.year, r.month);
  const w = wfh === null ? null
    : await wfh(tx, companyId, r.employee_id, first, last);
  const days = buildTimesheetDays(built, timeParams(first),
    await loadDecisions(tx, companyId, r.id), w);
  return { days, hash: sourceHash(built) };
}

function totals(days: TimesheetDay[]) {
  const sum = (f: (d: TimesheetDay) => number) =>
    days.reduce((n, d) => n + f(d), 0);
  return { scheduled: sum((d) => d.scheduledMinutes),
    worked: sum((d) => d.workedMinutes),
    overtime: sum((d) => d.overtimeMinutes),
    overtimeNight: sum((d) => d.overtimeNightMinutes),
    approvedOvertime: sum((d) => d.decision?.approvedMinutes ?? 0),
    approvedNight: sum((d) => d.decision?.approvedNightMinutes ?? 0),
    restDayWorkDays: days.filter((d) => d.restDayWorkMinutes > 0).length };
}

/**
 * A draft shows the rebuilt days; a submitted or approved sheet shows
 * its frozen days with the stored decisions, and `stale` when the
 * rebuilt source differs from the frozen one.
 */
export async function sheetView(tx: Db, companyId: string, r: SheetRow,
  today: string, wfh: WfhSource | null): Promise<Timesheet> {
  const now = await rebuild(tx, companyId, r, today, wfh);
  let days = now.days;
  if (r.status !== "draft") {
    const dec = await loadDecisions(tx, companyId, r.id);
    const live = new Map(now.days.map((d) => [d.date, d.wfh]));
    days = (r.days_json ?? []).map((d) => ({ ...d,
      decision: dec.get(d.date) ?? null, wfh: live.get(d.date) ?? null }));
  }
  const { first } = monthBounds(r.year, r.month);
  const flags = periodHourFlags(days.map((d) => ({ date: d.date,
    workedMinutes: d.workedMinutes })), timeParams(first));
  return { id: r.id, employeeId: r.employee_id, year: r.year,
    month: r.month, status: r.status,
    stale: r.status !== "draft" && now.hash !== r.source_hash,
    totals: totals(days), flags, submittedAt: r.submitted_at,
    submittedBy: r.submitted_by, approvedAt: r.approved_at,
    approvedBy: r.approved_by, days };
}

/** Frozen days carry no decision and no WFH totals (attached on read). */
export const freeze = (days: TimesheetDay[]): TimesheetDay[] =>
  days.map((d) => ({ ...d, decision: null, wfh: null }));
