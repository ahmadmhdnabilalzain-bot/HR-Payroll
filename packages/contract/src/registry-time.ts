import type { z } from "zod";
import * as settingsRoutes from "./routes-time-settings";
import * as settings from "./time-settings";
import * as rosters from "./time-rosters";
import * as clock from "./time-clock";
import * as sheets from "./time-timesheets";
import * as pay from "./time-pay-inputs";
import * as lp from "./time-leave-policy";
import * as wfh from "./time-wfh";
import * as wd from "./time-wfh-data";

function named(mod: Record<string, unknown>, names: readonly string[]) {
  const out: Record<string, z.ZodType> = {};
  for (const n of names) {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    out[n] = s as z.ZodType;
  }
  return out;
}

/** Plan 9's named schemas (OpenAPI components and EXAMPLES keys). */
export const TIME_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  ...named(settings, ["GeoPoint", "TimeFlagView", "TimeSettings",
    "TimeSettingsUpdate", "Holiday", "HolidayCreate", "HolidayUpdate",
    "SpecialPeriod", "SpecialPeriodCreate", "SpecialPeriodUpdate",
    "WorkSite", "WorkSiteCreate", "WorkSiteUpdate", "TimeProfile",
    "TimeProfileUpdate"]),
  ...named(settingsRoutes, ["HolidayList", "SpecialPeriodList",
    "WorkSiteList"]),
  ...named(rosters, ["ShiftTemplate", "ShiftTemplateCreate",
    "ShiftTemplateUpdate", "ShiftTemplateList", "RosterSlot",
    "RosterDay", "RosterDayList", "RosterPut", "EmployeeFlag",
    "RosterResult", "RotationApply", "RosterPublish", "PublishResult",
    "SwapRequest", "SwapRequestList", "SwapCreate", "SwapRespond",
    "SwapDecision"]),
  ...named(clock, ["ClockBody", "GeofenceView", "CorrectionRequest",
    "CorrectionRequestList", "CorrectionCreate", "CorrectionReject"]),
  ...named(sheets, ["OvertimeDecision", "TimesheetDay", "TimesheetSummary",
    "Timesheet", "TimesheetSummaryList", "TimesheetPrepare",
    "OvertimeDecisionInput", "TimesheetNote"]),
  ...named(pay, ["PayInputOvertime", "PayInputRestDayWork",
    "PayInputAbsence", "ManualItem", "PayInputEmployee", "PayInputs"]),
  ...named(lp, ["LeavePolicy", "LeavePolicyPut", "LeaveBlackout",
    "LeaveBlackoutList", "LeaveBlackoutCreate", "LeaveBlackoutUpdate",
    "LeaveWarning", "LeavePreview", "CarryOverRun", "CarryOverResult"]),
  ...named(wfh, ["WfhSettings", "WfhSettingsUpdate", "WfhNotice",
    "WfhNoticePublish", "WfhConsent", "WfhConsentCreate", "WfhWithdraw",
    "WfhWithdrawResult", "WfhStatus"]),
  ...named(wd, ["ActivityMinute", "WfhActivityUpload", "WfhActivityResult",
    "WfhLocationUpload", "WfhLocationPoint", "WfhLocationList",
    "WfhDayTotals", "WfhDay", "WfhDayList", "WfhDaySummary",
    "WfhDaySummaryList", "WfhExport"]),
};
