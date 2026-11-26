import { PAY_INPUTS_STATEMENT } from "./time-pay-inputs";
import { NEVER_COLLECTED, RETENTION_SOURCE } from "./time-wfh";

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

const collects = { activeTime: true, categories: true,
  locationHourly: true };
const consent = { employeeId: TIME_IDS.employee, noticeVersion: 1,
  decision: "granted", at: "2026-03-01T08:00:00.000Z" };

const point = { at: "2026-03-01T09:00:00.000Z", lat: 1.5, lng: 1.5,
  source: "phone" };
const totals = { activeMinutes: 10, idleMinutes: 0, pausedMinutes: 0,
  categories: { documents: 10 } };
const wfhDay = { date: "2026-03-01", attendanceIds: [id(13)], totals,
  hours: [{ hour: "13", activeMinutes: 10, categories: { documents: 10 } }],
  locations: [point] };

const ROSTER_EXAMPLES = {
  CalendarDayList: { items: [{ date: "2026-03-20",
    holiday: { name: "Company Day A", nameAr: null }, specialPeriod: null,
    companyRestDay: false, entries: [{ employeeId: TIME_IDS.employee,
      employeeName: "Sample Employee", kind: "shift", leave: null,
      shift: { start: "09:00", end: "17:00" } }] }] },
  AvailabilityDayList: { items: [{ date: "2026-03-02",
    departmentId: id(14), scheduled: 2, onLeave: 1, available: 1,
    minOnDuty: 2, belowMinimum: true }] },
  DepartmentStaffing: { departmentId: id(14), minOnDuty: 2 },
  AttendanceFlagList: { items: [{ employeeId: TIME_IDS.employee,
    code: "LATE_ARRIVAL", dates: ["2026-03-02"],
    explanation: "Clocked in after the shift start plus grace.",
    inputs: { lateMinutes: "6", graceMinutes: "5" }, basis: "record",
    rule: null, consequence: "none" }] },
  WfhActivityResult: { accepted: 10, duplicates: 0 },
  WfhLocationPoint: point,
  WfhLocationList: { items: [point] },
  WfhDayList: { items: [wfhDay] },
  WfhDaySummaryList: { items: [{ employeeId: TIME_IDS.employee,
    date: "2026-03-01", totals, locationSamples: 1 }] },
  WfhExport: { generatedAt: "2026-03-01T10:00:00.000Z",
    employeeId: TIME_IDS.employee, consents: [consent], pauses: [],
    days: [wfhDay], minutes: [{ at: "2026-03-01T09:00:00.000Z",
      active: true, category: "documents", attendanceId: id(13) }] },
  WfhSettings: { enabled: false, retentionDays: null,
    activityCategories: true, locationHourly: true,
    maxTrackedMinutesPerRecord: 960,
    impactAssessment: { done: false, date: null },
    legalReview: "not-reviewed", noticeVersion: null,
    neverCollected: [...NEVER_COLLECTED],
    retentionSource: RETENTION_SOURCE },
  WfhNotice: { version: 1, publishedAt: "2026-03-01T08:00:00.000Z",
    textEn: "Work-from-home tracking notice (version 1)", textAr: null,
    arabicStatus: "not-reviewed", collects,
    neverCollected: [...NEVER_COLLECTED], retentionDays: 30,
    legalReview: "not-reviewed", companyNote: null },
  WfhConsent: consent,
  WfhWithdrawResult: { consent: { ...consent, decision: "withdrawn" },
    erasedRows: 0 },
  WfhStatus: { state: "ready", attendanceId: null, trackedUntil: null,
    lastLocationAt: null, nextLocationDueAt: null, collects,
    noticeVersion: 1 },
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
