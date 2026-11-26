import type { LeaveWarning } from "@payroll/contract";
import type { Db } from "../db/db";

/**
 * The BELOW_STAFFING warning (Task 8 fills it from department
 * minimums). Never a refusal.
 */
export async function staffingWarning(_tx: Db, _companyId: string,
  _employeeId: string, _dates: string[]): Promise<LeaveWarning[]> {
  return [];
}
