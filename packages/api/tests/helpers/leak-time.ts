import type { App } from "../../src/http/context";
import type { Seeded } from "./seed";
import { call } from "./test-app";

/**
 * Plan 9's GET routes for the leak test: `{id}` kind per route (a
 * route missing here fails the test) and the query each one needs.
 */
export const TIME_ID_KIND: Record<string, "employee" | "timesheet" |
  "leaveType" | "employeeQuery" | null> = {
  getTimeSettings: null, listHolidays: null, listSpecialPeriods: null,
  listWorkSites: null, getTimeProfile: "employee",
  listShiftTemplates: null, getRoster: null, listSwapRequests: null,
  listCorrectionRequests: null, listTimesheets: null,
  getTimesheet: "timesheet", getPayInputs: null,
  getLeavePolicy: "leaveType", listLeaveBlackouts: null,
  getWfhSettings: null, getCurrentWfhNotice: null, getWfhStatus: null,
  getMyWfhDays: null, exportMyWfhData: null, getWfhSummary: null,
  listWfhLocations: "employeeQuery",
  getLeaveCalendar: null, getTeamAvailability: null,
  listAttendanceFlags: null,
};

/** Routes about the caller's own employee: owner and hr have none. */
export const SELF_ROUTES = new Set(["getWfhStatus", "getMyWfhDays",
  "exportMyWfhData"]);

/** Retention set and a WFH notice published (tracking stays off). */
export async function wfhFixtures(ctx: { app: App }, s: Seeded) {
  await call(ctx.app, s.owner.token, s.companyId, "PUT",
    "/v1/wfh/settings", { retentionDays: 30 });
  const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
    "/v1/wfh/notices", {});
  if (r.status !== 201) throw new Error(`notice ${r.status} ${r.text}`);
}

export const TIME_QUERY: Record<string, string> = {
  listHolidays: "?year=2026",
  listSpecialPeriods: "?year=2026",
  getRoster: "?from=2026-03-01&to=2026-03-31",
  listTimesheets: "?year=2026&month=3",
  getPayInputs: "?year=2026&month=3",
  listLeaveBlackouts: "?year=2026",
  getMyWfhDays: "?from=2026-03-01&to=2026-03-01",
  getWfhSummary: "?from=2026-03-01&to=2026-03-01",
  getLeaveCalendar: "?from=2026-03-01&to=2026-03-07",
  getTeamAvailability: "?from=2026-03-01&to=2026-03-07",
  listAttendanceFlags: "?from=2026-03-01&to=2026-03-07",
};

type Target = keyof Seeded["emp"];

/** One March timesheet per seeded employee, prepared by hr. */
export async function sheetFixtures(ctx: { app: App }, s: Seeded) {
  const out = {} as Record<Target, string>;
  for (const t of Object.keys(s.emp) as Target[]) {
    const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/time/timesheets", { employeeId: s.emp[t], year: 2026,
        month: 3 });
    if (r.status !== 201) throw new Error(`sheet ${r.status} ${r.text}`);
    out[t] = r.body.id;
  }
  return out;
}
