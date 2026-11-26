import type { WfhSource } from "./timesheets";

/**
 * Work-from-home day totals shown on a timesheet day (Task 10). Only
 * the employee and the sheet's deciders can read a sheet. Never used
 * by pay inputs.
 */
export const sheetWfh: WfhSource = async () => null;
