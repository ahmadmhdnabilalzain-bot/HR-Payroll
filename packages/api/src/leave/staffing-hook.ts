import type { LeaveWarning } from "@payroll/contract";
import type { Db } from "../db/db";
import { belowStaffingDates } from "../time/availability";

/** The BELOW_STAFFING warning from department minimums; never a refusal. */
export async function staffingWarning(tx: Db, companyId: string,
  employeeId: string, dates: string[]): Promise<LeaveWarning[]> {
  const below = await belowStaffingDates(tx, companyId, employeeId, dates);
  return below.length === 0 ? [] : [{ code: "BELOW_STAFFING",
    message: "The department would be below its staffing minimum",
    dates: below }];
}
