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
  "getLeavePolicy", "putLeavePolicy", "listLeaveBlackouts",
  "createLeaveBlackout", "updateLeaveBlackout", "previewLeaveRequest",
  "runLeaveCarryOver",
  "getLeaveCalendar", "getTeamAvailability", "putStaffingMinimum",
  "listAttendanceFlags",
  "getWfhSettings", "updateWfhSettings", "publishWfhNotice",
  "getCurrentWfhNotice", "recordWfhConsent", "withdrawWfhConsent",
  "getWfhStatus", "pauseWfh", "resumeWfh",
  "postWfhActivity", "postWfhLocation", "getMyWfhDays", "exportMyWfhData",
  "getWfhSummary", "listWfhLocations",
];

const MFA_IDS = ["listWfhLocations", "updateWfhSettings"];

const FORBIDDEN_PATH =
  /screenshot|screen|keystroke|keylog|capture|webcam|camera|microphone/i;

describe("TIME_ROUTES", () => {
  it("MFA and owner-only time routes are exactly these", () => {
    expect(TIME_ROUTES.filter((r) => r.mfa).map((r) => r.id).sort())
      .toEqual(MFA_IDS);
    expect(TIME_ROUTES.filter((r) => r.roles.length === 1)
      .map((r) => r.id)).toEqual(["updateWfhSettings"]);
  });
  it("has 66 routes (13 + 13 + 5 + 9 + 7 + 4 + 9 + 6)", () => {
    expect(TIME_ROUTES.length).toBe(66);
    expect(TIME_ROUTE_IDS.length).toBe(66);
  });
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
