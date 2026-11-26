import { wfhDayTotals } from "../wfh/views";
import type { WfhSource } from "./timesheets";

/**
 * Work-from-home day totals shown on a timesheet day (Task 10). Only
 * the employee and the sheet's deciders can read a sheet. Never used
 * by pay inputs.
 */
export const sheetWfhAt = (now: Date): WfhSource => async (tx,
  companyId, employeeId, from, to) => {
  const m = await wfhDayTotals(tx, companyId, employeeId, from, to, now);
  return new Map([...m].map(([d, t]) => [d, { activeMinutes:
    t.activeMinutes, idleMinutes: t.idleMinutes,
    pausedMinutes: t.pausedMinutes }]));
};
