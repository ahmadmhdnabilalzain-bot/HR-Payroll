import { wfhDayTotals } from "../wfh/views";
import type { WfhSource } from "./timesheets";

/**
 * Work-from-home day totals shown on a timesheet day (Task 10). Only
 * the employee and the sheet's deciders can read a sheet. Never used
 * by pay inputs.
 */
export const sheetWfh: WfhSource = async (tx, companyId, employeeId,
  from, to, today) => {
  // Retention is measured from the start of today (Dubai); the purge
  // that runs on every /v1/wfh/ call removes the expired rows anyway.
  const now = new Date(Date.parse(`${today}T00:00:00+04:00`));
  const m = await wfhDayTotals(tx, companyId, employeeId, from, to, now);
  return new Map([...m].map(([d, t]) => [d, { activeMinutes:
    t.activeMinutes, idleMinutes: t.idleMinutes,
    pausedMinutes: t.pausedMinutes }]));
};
