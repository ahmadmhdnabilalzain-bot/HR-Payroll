import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

/** True when a timesheet covering `date` is submitted or approved. */
export async function isDayLocked(tx: Db, companyId: string,
  employeeId: string, date: string): Promise<boolean> {
  const rows = await tx.query(
    `SELECT 1 FROM timesheets WHERE company_id = $1 AND employee_id = $2
     AND year = $3 AND month = $4 AND status IN ('submitted', 'approved')`,
    [companyId, employeeId, Number(date.slice(0, 4)),
      Number(date.slice(5, 7))]);
  return rows.length > 0;
}

/** 409 TIMESHEET_LOCKED when any of `dates` is locked. */
export async function assertUnlocked(tx: Db, companyId: string,
  employeeId: string, dates: readonly string[]): Promise<void> {
  for (const d of new Set(dates)) {
    if (await isDayLocked(tx, companyId, employeeId, d)) {
      throw new ApiError("TIMESHEET_LOCKED", undefined, { dates: [d] });
    }
  }
}
