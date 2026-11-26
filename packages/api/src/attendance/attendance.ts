import {
  MAX_RECORD_MS,
  type AttendanceCorrection,
  type AttendanceRecord,
} from "@payroll/contract";
import type { Tenant } from "../auth/guard";
import { appendAudit } from "../audit/audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import type { ClockFacts } from "../time/clock-geofence";
import { dubaiDate } from "../time/dubai";
import { assertUnlocked } from "../time/locks";
import { closePauses } from "../wfh/pause";

export interface AttendanceRow {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  minutes: number | null;
  source: "self" | "hr" | "correction";
  note: string | null;
  method: ClockFacts["method"] | null;
  work_location: ClockFacts["workLocation"] | null;
  geofence_mode: ClockFacts["geofenceMode"] | null;
  geofence_result: ClockFacts["result"] | null;
  geofence_site_id: string | null;
  geofence_distance_m: number | null;
  exception: ClockFacts["exception"];
}

/** Plan 9 fields appear once a record carries them (additive). */
function clockFields(r: AttendanceRow): Partial<AttendanceRecord> {
  const out: Partial<AttendanceRecord> = {};
  if (r.method !== null) out.method = r.method;
  if (r.work_location !== null) out.workLocation = r.work_location;
  if (r.geofence_mode !== null && r.geofence_result !== null) {
    out.geofence = { mode: r.geofence_mode, result: r.geofence_result,
      siteId: r.geofence_site_id, distanceM: r.geofence_distance_m };
    out.exception = r.exception ?? null;
  }
  return out;
}

export const toRecord = (r: AttendanceRow): AttendanceRecord => ({
  id: r.id, employeeId: r.employee_id, date: r.date, clockIn: r.clock_in,
  clockOut: r.clock_out, minutes: r.minutes, source: r.source,
  note: r.note, ...clockFields(r) });

/** Whole minutes, rounded down. Overtime is not computed. */
export function minutesBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / 60_000);
}

function linked(t: Tenant): string {
  if (t.employeeId === null) throw new ApiError("NO_EMPLOYEE_LINK");
  return t.employeeId;
}

/** Locks the employee row so parallel clock requests queue. */
async function openRecord(tx: Db, companyId: string, employeeId: string) {
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [companyId, employeeId]);
  const [r] = await tx.query<AttendanceRow>(
    `SELECT * FROM attendance WHERE company_id = $1 AND employee_id = $2
     AND clock_out IS NULL`, [companyId, employeeId]);
  return r ?? null;
}

/** The linked employee, refused before any write if already open. */
export async function clockInTarget(tx: Db, t: Tenant): Promise<string> {
  const emp = linked(t);
  if (await openRecord(tx, t.companyId, emp) !== null) {
    throw new ApiError("ALREADY_CLOCKED_IN");
  }
  return emp;
}

export async function clockIn(tx: Db, t: Tenant, id: string, now: Date,
  f: ClockFacts): Promise<AttendanceRow> {
  const emp = await clockInTarget(tx, t);
  const at = now.toISOString();
  const [r] = await tx.query<AttendanceRow>(
    `INSERT INTO attendance (id, company_id, employee_id, date, clock_in,
       source, created_at, method, work_location, geofence_mode,
       geofence_result, geofence_site_id, geofence_distance_m, exception)
     VALUES ($1, $2, $3, $4, $5, 'self', $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`, [id, t.companyId, emp, dubaiDate(now), at, f.method,
      f.workLocation, f.geofenceMode, f.result, f.siteId, f.distanceM,
      f.exception]);
  return r!;
}

export async function clockOut(tx: Db, t: Tenant, now: Date)
  : Promise<AttendanceRow> {
  const open = await openRecord(tx, t.companyId, linked(t));
  if (open === null) throw new ApiError("NOT_CLOCKED_IN");
  const at = now.toISOString();
  // More than 24 hours after clock-in: the record stays open (shown
  // as a missed clock-out) and is fixed by a correction instead.
  if (now.getTime() - Date.parse(open.clock_in) > MAX_RECORD_MS) {
    throw new ApiError("CLOCK_OUT_TOO_LATE");
  }
  const [r] = await tx.query<AttendanceRow>(
    `UPDATE attendance SET clock_out = $3, minutes = $4
     WHERE company_id = $1 AND id = $2 RETURNING *`,
    [t.companyId, open.id, at, minutesBetween(open.clock_in, at)]);
  await closePauses(tx, t.companyId, open.id, at);
  return r!;
}

export async function loadRecord(tx: Db, companyId: string, id: string)
  : Promise<AttendanceRow> {
  const [r] = await tx.query<AttendanceRow>(
    "SELECT * FROM attendance WHERE company_id = $1 AND id = $2 FOR UPDATE",
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** A correction may span at most this long (a decision, not a law). */
export const MAX_CORRECTION_MS = 24 * 3600 * 1000;

function checkTimes(c: { clockIn: string; clockOut: string | null },
  now: Date): void {
  const bad = (field: string, msg: string) => new ApiError(
    "VALIDATION_FAILED", msg, { fields: [`body.${field}`] });
  const start = Date.parse(c.clockIn);
  if (start > now.getTime()) throw bad("clockIn", "clockIn is in the future");
  if (c.clockOut === null) return;
  const end = Date.parse(c.clockOut);
  if (end < start) throw bad("clockOut", "clockOut is before clockIn");
  if (end > now.getTime()) throw bad("clockOut", "clockOut is in the future");
  if (end - start > MAX_CORRECTION_MS) {
    throw bad("clockOut", "a record may span at most 24 hours");
  }
}

/** Reopening a record while the person has another open one: 409. */
async function checkOpen(tx: Db, companyId: string, r: AttendanceRow,
  clockOut: string | null): Promise<void> {
  if (clockOut !== null) return;
  await tx.query("SELECT 1 FROM employees WHERE company_id = $1 AND " +
    "id = $2 FOR UPDATE", [companyId, r.employee_id]);
  const other = await tx.query(
    `SELECT 1 FROM attendance WHERE company_id = $1 AND employee_id = $2
     AND clock_out IS NULL AND id <> $3`, [companyId, r.employee_id, r.id]);
  if (other.length > 0) throw new ApiError("ALREADY_CLOCKED_IN");
}

export async function correct(tx: Db, companyId: string, old: AttendanceRow,
  c: { clockIn: string; clockOut: string | null; note: string }, now: Date,
  source: "hr" | "correction" = "hr"): Promise<AttendanceRow> {
  checkTimes(c, now);
  await checkOpen(tx, companyId, old, c.clockOut);
  const id = old.id;
  const minutes = c.clockOut === null ? null
    : minutesBetween(c.clockIn, c.clockOut);
  const [r] = await tx.query<AttendanceRow>(
    `UPDATE attendance SET clock_in = $3, clock_out = $4, minutes = $5,
       source = $8, note = $6, date = $7
     WHERE company_id = $1 AND id = $2 RETURNING *`,
    [companyId, id, c.clockIn, c.clockOut, minutes, c.note,
      dubaiDate(new Date(Date.parse(c.clockIn))), source]);
  if (c.clockOut !== null) await closePauses(tx, companyId, id, c.clockOut);
  return r!;
}

/**
 * Plan 3's hr correction, reused on approval of a correction request.
 * A day inside a submitted or approved timesheet refuses (409
 * TIMESHEET_LOCKED), both the old and the new date. The audit row
 * keeps the old and new times.
 */
export async function correctAttendance(ctx: ReqCtx, id: string,
  body: AttendanceCorrection, source: "hr" | "correction" = "hr")
  : Promise<AttendanceRecord> {
  const co = ctx.tenant!.companyId;
  const old = await loadRecord(ctx.tx, co, id);
  await assertUnlocked(ctx.tx, co, old.employee_id, [old.date,
    dubaiDate(new Date(Date.parse(body.clockIn)))]);
  const r = await correct(ctx.tx, co, old, body, ctx.deps.now(), source);
  const data: Record<string, string> = { oldClockIn: old.clock_in,
    newClockIn: r.clock_in };
  if (old.clock_out !== null) data.oldClockOut = old.clock_out;
  if (r.clock_out !== null) data.newClockOut = r.clock_out;
  await appendAudit(ctx.tx, { companyId: co,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "attendance.corrected", entityType: "attendance",
    entityId: r.id, data });
  return toRecord(r);
}
