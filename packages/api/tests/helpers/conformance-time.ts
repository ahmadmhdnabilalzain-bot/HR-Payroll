import type { Res } from "./test-app";

/** The conformance recorder: calls one route by id. */
export type Hitter = (id: string, token: string | null,
  company: string | null, params?: Record<string, string>, body?: unknown,
  extra?: { query?: string; headers?: Record<string, string> }) =>
  Promise<Res>;

export interface TimeFlowCtx {
  hit: Hitter;
  owner: string;
  emp: string;
  c: string;
  empId: string;
}

/** One happy-path call per Plan 9 Task 3 route. */
async function settingsFlow(f: TimeFlowCtx): Promise<string> {
  const { hit, owner, emp, c, empId } = f;
  await hit("getTimeSettings", emp, c);
  await hit("updateTimeSettings", owner, c, {}, { restDays: ["wed"] });
  const year = { query: "?year=2026" };
  const h = await hit("createHoliday", owner, c, {}, { date: "2026-03-20",
    name: "Company Day A", kind: "company" });
  await hit("updateHoliday", owner, c, { id: h.body.id }, { nameAr: null });
  await hit("listHolidays", emp, c, {}, undefined, year);
  const p = await hit("createSpecialPeriod", owner, c, {}, {
    kind: "ramadan", name: "Test period", start: "2026-02-18",
    end: "2026-02-20" });
  await hit("updateSpecialPeriod", owner, c, { id: p.body.id },
    { name: "Test period B" });
  await hit("listSpecialPeriods", emp, c, {}, undefined, year);
  const s = await hit("createWorkSite", owner, c, {}, { name: "Site A",
    point: { lat: 1.5, lng: 1.5 }, radiusM: 200 });
  await hit("updateWorkSite", owner, c, { id: s.body.id }, { radiusM: 300 });
  await hit("listWorkSites", owner, c);
  await hit("updateTimeProfile", owner, c, { id: empId }, {
    workMode: "hybrid", geofenceMode: "record", workSiteIds: [s.body.id],
    wfhTracked: false, shiftWorker: false });
  await hit("getTimeProfile", emp, c, { id: empId });
  return s.body.id as string;
}

/** A second employee with a user (a swap peer); returns both. */
async function peer(f: TimeFlowCtx) {
  const { hit, owner, c } = f;
  const e = await hit("createEmployee", owner, c, {}, { number: "E-9",
    fullName: "Peer Nine", jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate: "2019-01-01" });
  const inv = await hit("inviteUser", owner, c, {}, {
    email: "peer9@example.com", role: "employee", employeeId: e.body.id });
  const acc = await hit("acceptInvite", null, null, {}, {
    setupToken: inv.body.setupToken, password: "correct horse battery " +
      "staple", displayName: "Peer" });
  return { id: e.body.id as string, token: acc.body.token as string };
}

async function rosterFlow(f: TimeFlowCtx, p: { id: string }) {
  const { hit, owner, emp, c, empId } = f;
  const t = await hit("createShiftTemplate", owner, c, {}, {
    name: "Shift A", start: "09:00", end: "17:00", breakMinutes: 60 });
  await hit("updateShiftTemplate", owner, c, { id: t.body.id },
    { nameAr: null });
  await hit("listShiftTemplates", emp, c);
  const slot = { kind: "shift", shiftTemplateId: t.body.id };
  await hit("putRosterEntries", owner, c, {}, { entries: [
    { employeeId: empId, date: "2026-03-10", slot },
    { employeeId: empId, date: "2026-03-11", slot },
    { employeeId: empId, date: "2026-03-12", slot }] });
  await hit("applyRotation", owner, c, {}, { employeeIds: [p.id],
    from: "2026-03-10", to: "2026-03-12", pattern: [null] });
  await hit("publishRoster", owner, c, {}, { from: "2026-03-10",
    to: "2026-03-12" });
  await hit("getRoster", emp, c, {}, undefined,
    { query: "?from=2026-03-10&to=2026-03-12" });
}

async function swapFlow(f: TimeFlowCtx, p: { id: string; token: string }) {
  const { hit, owner, emp, c } = f;
  const ask = (date: string) => hit("createSwapRequest", emp, c, {},
    { date, withEmployeeId: p.id });
  const a = await ask("2026-03-10");
  await hit("respondSwapRequest", p.token, c, { id: a.body.id },
    { accept: true });
  await hit("approveSwapRequest", owner, c, { id: a.body.id }, {});
  const b = await ask("2026-03-11");
  await hit("respondSwapRequest", p.token, c, { id: b.body.id },
    { accept: true });
  await hit("rejectSwapRequest", owner, c, { id: b.body.id }, {});
  const d = await ask("2026-03-12");
  await hit("cancelSwapRequest", emp, c, { id: d.body.id });
  await hit("listSwapRequests", emp, c);
}

async function correctionFlow(f: TimeFlowCtx) {
  const { hit, owner, emp, c } = f;
  const ask = (d: string) => hit("createCorrectionRequest", emp, c, {}, {
    date: d, clockIn: `${d}T05:00:00.000Z`, clockOut: `${d}T13:00:00.000Z`,
    reason: "Forgot to clock in" });
  const a = await ask("2026-03-02");
  await hit("approveCorrectionRequest", owner, c, { id: a.body.id });
  const b = await ask("2026-03-03");
  await hit("rejectCorrectionRequest", owner, c, { id: b.body.id }, {});
  const d = await ask("2026-03-04");
  await hit("cancelCorrectionRequest", emp, c, { id: d.body.id });
  await hit("listCorrectionRequests", emp, c);
}

/** February has ended at the conformance clock (2026-03-01). */
async function timesheetFlow(f: TimeFlowCtx) {
  const { hit, owner, emp, c } = f;
  const feb = { year: 2026, month: 2 };
  const s = await hit("prepareTimesheet", emp, c, {}, feb);
  const id = { id: s.body.id as string };
  await hit("getTimesheet", emp, c, id);
  await hit("listTimesheets", emp, c, {}, undefined,
    { query: "?year=2026&month=2" });
  await hit("submitTimesheet", emp, c, id);
  await hit("decideOvertime", owner, c, id, { days: [{
    date: "2026-02-02", approvedMinutes: 0, approvedNightMinutes: 0 }] });
  await hit("approveTimesheet", owner, c, id);
  await hit("getPayInputs", owner, c, {}, undefined,
    { query: "?year=2026&month=2" });
  await hit("reopenTimesheet", owner, c, id, { note: "check again" });
  await hit("submitTimesheet", emp, c, id);
  await hit("rejectTimesheet", owner, c, id, { note: "fix a day" });
}

async function leaveFlow(f: TimeFlowCtx) {
  const { hit, owner, emp, c } = f;
  const t = await hit("createLeaveType", owner, c, {}, { name: "Type C",
    paid: true, annualDays: 30 });
  const id = { id: t.body.id as string };
  await hit("getLeavePolicy", emp, c, id);
  await hit("putLeavePolicy", owner, c, id, { payrollKind: "annual",
    accrual: "upfront", joiningYearProRata: false, dayCount: "calendar",
    halfDays: true, carryOverMaxDays: 5, carryOverExpiresMonths: 3,
    minNoticeDays: 0, maxConsecutiveDays: null, allowNegative: false });
  const b = await hit("createLeaveBlackout", owner, c, {}, {
    name: "Test period", from: "2026-12-01", to: "2026-12-02",
    leaveTypeIds: [], departmentId: null, mode: "warn" });
  await hit("updateLeaveBlackout", owner, c, { id: b.body.id },
    { mode: "block" });
  await hit("listLeaveBlackouts", emp, c, {}, undefined,
    { query: "?year=2026" });
  await hit("previewLeaveRequest", emp, c, {}, { leaveTypeId: id.id,
    startDate: "2026-06-01", endDate: "2026-06-01", startPart: "am",
    endPart: "am" });
  await hit("runLeaveCarryOver", owner, c, {}, { fromYear: 2025 });
}

/** Tracking on for the employee, a remote record, then pause. */
async function wfhOn(f: TimeFlowCtx) {
  const { hit, owner, emp, c, empId } = f;
  await hit("updateTimeProfile", owner, c, { id: empId }, {
    workMode: "hybrid", geofenceMode: "off", workSiteIds: [],
    wfhTracked: true, shiftWorker: false });
  await hit("getWfhSettings", emp, c);
  await hit("updateWfhSettings", owner, c, {}, { retentionDays: 30,
    impactAssessment: { done: true, date: "2026-02-01" } });
  const n = await hit("publishWfhNotice", owner, c, {}, {});
  await hit("updateWfhSettings", owner, c, {}, { enabled: true });
  await hit("getCurrentWfhNotice", emp, c);
  await hit("recordWfhConsent", emp, c, {}, {
    noticeVersion: n.body.version, decision: "granted" });
  const rec = await hit("clockIn", emp, c, {}, { method: "web",
    workLocation: "remote" });
  await hit("getWfhStatus", emp, c);
  await hit("pauseWfh", emp, c);
  await hit("resumeWfh", emp, c);
  return rec.body as { id: string; clockIn: string };
}

async function wfhData(f: TimeFlowCtx, rec: { id: string;
  clockIn: string }) {
  const { hit, owner, emp, c, empId } = f;
  const t = Math.ceil(Date.parse(rec.clockIn) / 60_000) * 60_000;
  await hit("postWfhActivity", emp, c, {}, { attendanceId: rec.id,
    minutes: [{ at: new Date(t).toISOString(), active: true,
      category: "documents" }] });
  await hit("postWfhLocation", emp, c, {}, { attendanceId: rec.id,
    at: rec.clockIn, lat: 1.5, lng: 1.5, accuracyM: 10, source: "phone",
    indicatorShown: true });
  const day = { query: "?from=2026-03-01&to=2026-03-01" };
  await hit("getMyWfhDays", emp, c, {}, undefined, day);
  await hit("exportMyWfhData", emp, c);
  await hit("getWfhSummary", emp, c, {}, undefined, day);
  await hit("listWfhLocations", owner, c, {}, undefined, {
    query: `?from=2026-03-01&to=2026-03-01&employeeId=${empId}` });
}

async function wfhOff(f: TimeFlowCtx) {
  const { hit, emp, c } = f;
  await hit("clockOut", emp, c);
  await hit("withdrawWfhConsent", emp, c, {}, { erase: false });
}

async function calendarFlow(f: TimeFlowCtx) {
  const { hit, owner, emp, c } = f;
  const week = { query: "?from=2026-03-01&to=2026-03-07" };
  await hit("getLeaveCalendar", emp, c, {}, undefined, week);
  await hit("getTeamAvailability", emp, c, {}, undefined, week);
  const d = await hit("listDepartments", owner, c);
  await hit("putStaffingMinimum", owner, c, { id: d.body.items[0].id },
    { minOnDuty: 1 });
  await hit("listAttendanceFlags", emp, c, {}, undefined, week);
}

/** Every Plan 9 route, in task order. */
export async function timeFlow(f: TimeFlowCtx): Promise<void> {
  await settingsFlow(f);
  const p = await peer(f);
  await rosterFlow(f, p);
  await swapFlow(f, p);
  await correctionFlow(f);
  await timesheetFlow(f);
  await leaveFlow(f);
  await calendarFlow(f);
  await wfhData(f, await wfhOn(f));
  await wfhOff(f);
}
