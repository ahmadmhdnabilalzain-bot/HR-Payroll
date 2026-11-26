import { PAY_INPUTS_STATEMENT } from "./time-pay-inputs";

/**
 * Plan 9 examples. Fixture names only ("Company Day A"), arbitrary
 * dates and coordinates; no real calendar data and no legal value.
 */
const id = (n: number) =>
  `00000000-0000-4000-8000-9${String(n).padStart(11, "0")}`;
export const TIME_IDS = { holiday: id(1), period: id(2), site: id(3),
  employee: id(4) };

const holiday = { id: TIME_IDS.holiday, date: "2026-03-20",
  name: "Company Day A", nameAr: null, kind: "company", status: "active" };
const period = { id: TIME_IDS.period, kind: "ramadan",
  name: "Test period", start: "2026-02-18", end: "2026-03-19",
  status: "active" };
const site = { id: TIME_IDS.site, name: "Site A",
  point: { lat: 1.5, lng: 1.5 }, radiusM: 200, status: "active" };

const shift = { id: id(5), name: "Shift A", nameAr: null, start: "09:00",
  end: "17:00", breakMinutes: 60, crossesMidnight: false, netMinutes: 420,
  status: "active" };
const slot = { kind: "shift", shiftTemplateId: id(5), start: "09:00",
  end: "17:00", breakMinutes: 60, netMinutes: 420 };
const rosterDay = { employeeId: TIME_IDS.employee, date: "2026-03-02",
  draft: slot, published: slot, publishedAt: "2026-03-01T08:00:00.000Z",
  changedSincePublish: false, version: 1 };
const flag = { employeeId: TIME_IDS.employee, code: "NO_WEEKLY_REST",
  dates: ["2026-03-02"], detail: {}, rule: null };
const swap = { id: id(6), requesterEmployeeId: TIME_IDS.employee,
  date: "2026-03-02", peerEmployeeId: id(7), peerDate: "2026-03-02",
  status: "pending-peer", requesterSlot: slot, peerSlot: { kind: "rest" },
  flagsAfter: [], decidedBy: null, decidedAt: null,
  createdAt: "2026-03-01T08:00:00.000Z" };

const correction = { id: id(8), employeeId: TIME_IDS.employee,
  attendanceId: null, date: "2026-03-02",
  clockIn: "2026-03-02T05:00:00.000Z", clockOut: "2026-03-02T13:00:00.000Z",
  reason: "Forgot to clock in", status: "pending",
  requestedBy: id(9), decidedBy: null, decidedAt: null, decisionNote: null };

const summary = { id: id(10), employeeId: TIME_IDS.employee, year: 2026,
  month: 3, status: "draft", stale: false, totals: { scheduled: 420,
    worked: 420, overtime: 0, overtimeNight: 0, approvedOvertime: 0,
    approvedNight: 0, restDayWorkDays: 0 }, flags: [], submittedAt: null,
  submittedBy: null, approvedAt: null, approvedBy: null };
const sheetDay = { date: "2026-03-02", kind: "work", shift: { start:
  "09:00", end: "17:00", breakMinutes: 60 }, records: [], leave: null,
  scheduledMinutes: 420, workedMinutes: 0, lateMinutes: 0,
  earlyLeaveMinutes: 0, overtimeMinutes: 0, overtimeNightMinutes: 0,
  restDayWorkMinutes: 0, decision: null, flags: [], trace: [], wfh: null };

const blackout = { id: id(11), name: "Test period", from: "2026-12-01",
  to: "2026-12-10", leaveTypeIds: [], departmentId: null, mode: "warn",
  status: "active" };

const ROSTER_EXAMPLES = {
  LeavePolicy: { leaveTypeId: id(12), payrollKind: "annual",
    accrual: "upfront", joiningYearProRata: false, dayCount: "calendar",
    halfDays: false, carryOverMaxDays: null, carryOverExpiresMonths: null,
    minNoticeDays: 0, maxConsecutiveDays: null, allowNegative: false,
    isDefault: true, warnings: [] },
  LeaveBlackout: blackout,
  LeaveBlackoutList: { items: [blackout] },
  LeavePreview: { days: 1, dates: [{ date: "2026-03-02", part: "full" }],
    skipped: [], balanceAfter: null, warnings: [], blocked: null },
  CarryOverResult: { fromYear: 2026, toYear: 2027, rows: [],
    alreadyRun: false },
  TimesheetSummaryList: { items: [summary] },
  Timesheet: { ...summary, days: [sheetDay] },
  PayInputs: { year: 2026, month: 3, statement: PAY_INPUTS_STATEMENT,
    sickYear: "calendar-year", employees: [], missingTimesheets: [],
    notApproved: [], flagsNotDeducted: [] },
  CorrectionRequest: correction,
  CorrectionRequestList: { items: [correction] },
  ShiftTemplate: shift,
  ShiftTemplateList: { items: [shift] },
  RosterDayList: { items: [rosterDay] },
  RosterResult: { days: [rosterDay], flags: [flag] },
  PublishResult: { published: 1, flags: [flag] },
  SwapRequest: swap,
  SwapRequestList: { items: [swap] },
};

export const TIME_EXAMPLES: Readonly<Record<string, unknown>> = {
  ...ROSTER_EXAMPLES,
  TimeSettings: { restDays: [], graceMinutes: 5, lateFlagThreshold: 3,
    restAdjacentAbsenceThreshold: 2, shortSickSpellThreshold: 3,
    accuracyAllowanceM: 50, productDefaults: ["graceMinutes"] },
  Holiday: holiday,
  HolidayList: { items: [holiday] },
  SpecialPeriod: period,
  SpecialPeriodList: { items: [period] },
  WorkSite: site,
  WorkSiteList: { items: [site] },
  TimeProfile: { employeeId: TIME_IDS.employee, workMode: "site",
    geofenceMode: "off", workSiteIds: [], wfhTracked: false,
    shiftWorker: false },
};
