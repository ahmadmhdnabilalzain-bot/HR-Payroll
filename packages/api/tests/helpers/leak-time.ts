import type { App } from "../../src/http/context";
import type { Seeded } from "./seed";
import { call } from "./test-app";

/**
 * Plan 9's GET routes for the leak test: `{id}` kind per route (a
 * route missing here fails the test) and the query each one needs.
 */
export const TIME_ID_KIND: Record<string, "employee" | "timesheet" |
  null> = {
  getTimeSettings: null, listHolidays: null, listSpecialPeriods: null,
  listWorkSites: null, getTimeProfile: "employee",
  listShiftTemplates: null, getRoster: null, listSwapRequests: null,
  listCorrectionRequests: null, listTimesheets: null,
  getTimesheet: "timesheet", getPayInputs: null,
};

export const TIME_QUERY: Record<string, string> = {
  listHolidays: "?year=2026",
  listSpecialPeriods: "?year=2026",
  getRoster: "?from=2026-03-01&to=2026-03-31",
  listTimesheets: "?year=2026&month=3",
  getPayInputs: "?year=2026&month=3",
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
