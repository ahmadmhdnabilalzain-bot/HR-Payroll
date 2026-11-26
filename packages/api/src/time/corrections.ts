import type {
  CorrectionCreate,
  CorrectionRequest,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { dubaiDate } from "./dubai";
import { assertUnlocked } from "./locks";

export interface CorrectionRow { id: string; employee_id: string;
  attendance_id: string | null; date: string; clock_in: string;
  clock_out: string | null; reason: string;
  status: CorrectionRequest["status"]; requested_by: string;
  decided_by: string | null; decided_at: string | null;
  decision_note: string | null }

export const toCorrection = (r: CorrectionRow): CorrectionRequest => ({
  id: r.id, employeeId: r.employee_id, attendanceId: r.attendance_id,
  date: r.date, clockIn: r.clock_in, clockOut: r.clock_out,
  reason: r.reason, status: r.status, requestedBy: r.requested_by,
  decidedBy: r.decided_by, decidedAt: r.decided_at,
  decisionNote: r.decision_note });

export async function loadCorrection(tx: Db, companyId: string,
  id: string, lock = false): Promise<CorrectionRow> {
  const [r] = await tx.query<CorrectionRow>(
    `SELECT * FROM attendance_corrections WHERE company_id = $1
     AND id = $2 ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

const DAY_MS = 24 * 3600 * 1000;
const bad = (why: string) => new ApiError("CORRECTION_TIMES_INVALID", why);

/**
 * The clock-in falls on `date` in Dubai; clock-out is not before it and
 * at most 24 hours later; a new record needs a clock-out.
 */
function checkTimes(b: CorrectionCreate) {
  if (dubaiDate(new Date(Date.parse(b.clockIn))) !== b.date) {
    throw bad("clockIn is not on date (Dubai time)");
  }
  if (b.clockOut === null) {
    if (b.attendanceId === undefined) throw bad("a new record needs clockOut");
    return;
  }
  const span = Date.parse(b.clockOut) - Date.parse(b.clockIn);
  if (span < 0 || span > DAY_MS) {
    throw bad("clockOut must be within 24 hours after clockIn");
  }
}

/** A closed record of that day other than the target overlaps. */
export async function assertNoOverlap(tx: Db, companyId: string,
  employeeId: string, c: { date: string; clockIn: string;
    clockOut: string | null; attendanceId: string | null }) {
  const end = c.clockOut ?? c.clockIn;
  const rows = await tx.query(
    `SELECT 1 FROM attendance WHERE company_id = $1 AND employee_id = $2
     AND date = $3 AND clock_out IS NOT NULL
     AND id IS DISTINCT FROM $6::uuid
     AND clock_in < $5 AND clock_out > $4`,
    [companyId, employeeId, c.date, c.clockIn, end, c.attendanceId]);
  if (rows.length > 0) throw new ApiError("ATTENDANCE_OVERLAP");
}

/** The target record belongs to the employee (else 403) and the date. */
async function checkTarget(tx: Db, companyId: string, employeeId: string,
  b: CorrectionCreate) {
  if (b.attendanceId === undefined) return;
  const [r] = await tx.query<{ employee_id: string; date: string }>(
    "SELECT employee_id, date FROM attendance WHERE company_id = $1 AND " +
    "id = $2", [companyId, b.attendanceId]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  if (r.employee_id !== employeeId) throw new ApiError("FORBIDDEN");
  if (r.date !== b.date) throw bad("the record is on another date");
}

/** Every rule of a new request for `employeeId` (the caller). */
export async function checkCorrection(tx: Db, companyId: string,
  employeeId: string, b: CorrectionCreate): Promise<void> {
  checkTimes(b);
  await checkTarget(tx, companyId, employeeId, b);
  await assertUnlocked(tx, companyId, employeeId, [b.date]);
  await assertNoOverlap(tx, companyId, employeeId, { date: b.date,
    clockIn: b.clockIn, clockOut: b.clockOut,
    attendanceId: b.attendanceId ?? null });
}
