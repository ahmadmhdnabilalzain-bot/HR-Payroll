import type { AttendanceRecord } from "@payroll/contract";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";

export interface AttendanceRow {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  minutes: number | null;
  source: "self" | "hr";
  note: string | null;
}

export const toRecord = (r: AttendanceRow): AttendanceRecord => ({
  id: r.id, employeeId: r.employee_id, date: r.date, clockIn: r.clock_in,
  clockOut: r.clock_out, minutes: r.minutes, source: r.source,
  note: r.note });

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

export async function clockIn(tx: Db, t: Tenant, id: string, now: Date)
  : Promise<AttendanceRow> {
  const emp = linked(t);
  if (await openRecord(tx, t.companyId, emp) !== null) {
    throw new ApiError("ALREADY_CLOCKED_IN");
  }
  const at = now.toISOString();
  const [r] = await tx.query<AttendanceRow>(
    `INSERT INTO attendance (id, company_id, employee_id, date, clock_in,
       source, created_at) VALUES ($1, $2, $3, $4, $5, 'self', $5)
     RETURNING *`, [id, t.companyId, emp, dubaiDate(now), at]);
  return r!;
}

export async function clockOut(tx: Db, t: Tenant, now: Date)
  : Promise<AttendanceRow> {
  const open = await openRecord(tx, t.companyId, linked(t));
  if (open === null) throw new ApiError("NOT_CLOCKED_IN");
  const at = now.toISOString();
  const [r] = await tx.query<AttendanceRow>(
    `UPDATE attendance SET clock_out = $3, minutes = $4
     WHERE company_id = $1 AND id = $2 RETURNING *`,
    [t.companyId, open.id, at, minutesBetween(open.clock_in, at)]);
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

export async function correct(tx: Db, companyId: string, id: string,
  c: { clockIn: string; clockOut: string | null; note: string })
  : Promise<AttendanceRow> {
  if (c.clockOut !== null && Date.parse(c.clockOut) < Date.parse(c.clockIn)) {
    throw new ApiError("VALIDATION_FAILED", "clockOut is before clockIn",
      { fields: ["body.clockOut"] });
  }
  const minutes = c.clockOut === null ? null
    : minutesBetween(c.clockIn, c.clockOut);
  const [r] = await tx.query<AttendanceRow>(
    `UPDATE attendance SET clock_in = $3, clock_out = $4, minutes = $5,
       source = 'hr', note = $6, date = $7
     WHERE company_id = $1 AND id = $2 RETURNING *`,
    [companyId, id, c.clockIn, c.clockOut, minutes, c.note,
      dubaiDate(new Date(Date.parse(c.clockIn)))]);
  return r!;
}
