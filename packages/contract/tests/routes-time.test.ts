import { describe, expect, it } from "vitest";
import { ROUTES, TIME_ROUTES } from "../src/index";

/** Plan 9's own routes, in order; each task appends its ids. */
const TIME_ROUTE_IDS = [
  "getTimeSettings", "updateTimeSettings", "listHolidays",
  "createHoliday", "updateHoliday", "listSpecialPeriods",
  "createSpecialPeriod", "updateSpecialPeriod", "listWorkSites",
  "createWorkSite", "updateWorkSite", "getTimeProfile",
  "updateTimeProfile",
  "listShiftTemplates", "createShiftTemplate", "updateShiftTemplate",
  "getRoster", "putRosterEntries", "applyRotation", "publishRoster",
  "listSwapRequests", "createSwapRequest", "respondSwapRequest",
  "approveSwapRequest", "rejectSwapRequest", "cancelSwapRequest",
  "listCorrectionRequests", "createCorrectionRequest",
  "approveCorrectionRequest", "rejectCorrectionRequest",
  "cancelCorrectionRequest",
  "listTimesheets", "getTimesheet", "prepareTimesheet", "submitTimesheet",
  "decideOvertime", "approveTimesheet", "rejectTimesheet",
  "reopenTimesheet", "getPayInputs",
];

const FORBIDDEN_PATH =
  /screenshot|screen|keystroke|keylog|capture|webcam|camera|microphone/i;

describe("TIME_ROUTES", () => {
  it("lists exactly Plan 9's ids in order", () => {
    expect(TIME_ROUTES.map((r) => r.id)).toEqual(TIME_ROUTE_IDS);
  });
  it("every time route is a tenant route", () => {
    for (const r of TIME_ROUTES) expect(r.auth, r.id).toBe("tenant");
  });
  it("every time route is in ROUTES (membership, not a total)", () => {
    for (const r of TIME_ROUTES) expect(ROUTES, r.id).toContain(r);
  });
  it("no (method, path) pair repeats in ROUTES", () => {
    const keys = ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("no capture route and no DELETE anywhere", () => {
    for (const r of ROUTES) {
      expect(FORBIDDEN_PATH.test(r.path), r.path).toBe(false);
      expect(r.method as string, r.id).not.toBe("DELETE");
    }
  });
});
