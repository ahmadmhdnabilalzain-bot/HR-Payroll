import type { TimesheetDay } from "@payroll/contract";
import type { Absence, OvertimeEntry, RestDayWork } from "@payroll/engine";
import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import { buildPayInputs, type PayInputSource } from "../src/time/pay-inputs";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

const E = "00000000-0000-4000-8000-0000000000e1";
const S = "00000000-0000-4000-8000-0000000000f1";
const U = "00000000-0000-4000-8000-0000000000d1";
const AT = "2026-04-02T08:00:00.000Z";

function d(date: string, o: Partial<TimesheetDay> = {}): TimesheetDay {
  return { date, kind: "work", shift: { start: "09:00", end: "17:00",
    breakMinutes: 60 }, records: [{ attendanceId: U, clockIn: AT,
    clockOut: AT }], leave: null, scheduledMinutes: 420,
  workedMinutes: 420, lateMinutes: 0, earlyLeaveMinutes: 0,
  overtimeMinutes: 0, overtimeNightMinutes: 0, restDayWorkMinutes: 0,
  decision: null, flags: [], trace: [], wfh: null, ...o };
}
const ot = (approvedMinutes: number, approvedNightMinutes = 0) => ({
  approvedMinutes, approvedNightMinutes, restDayWork: null, decidedBy: U,
  decidedAt: AT });

function src(days: TimesheetDay[], o: Partial<PayInputSource> = {})
  : PayInputSource {
  return { year: 2026, month: 3, employees: [{ employeeId: E,
    joiningDate: "2020-01-01", lastWorkingDate: null }],
  timesheets: [{ employeeId: E, id: S, status: "approved", stale: false,
    days }], leaveDates: [], sickHalvesBefore: {}, maternityRunBefore: {},
  ...o };
}
const one = (s: PayInputSource) => buildPayInputs(s).employees[0]!;
const codes = (s: PayInputSource) =>
  one(s).needsManualEntry.map((m) => m.code);

describe("buildPayInputs (pure)", () => {
  it("shapes are Plan 5's engine types", () => {
    const e = one(src([d("2026-03-02", { overtimeMinutes: 60,
      decision: ot(60) })]));
    const o: OvertimeEntry[] = e.overtime;
    const r: RestDayWork[] = e.restDayWork;
    const a: Absence[] = e.absences;
    expect([o.length, r.length, a.length]).toEqual([1, 0, 0]);
  });

  it("only_approved_feed_arrays", () => {
    const s = src([d("2026-03-02", { decision: ot(60) })]);
    s.timesheets[0]!.status = "submitted";
    const out = buildPayInputs(s);
    expect(out.employees).toEqual([]);
    expect(out.notApproved).toEqual([{ employeeId: E, timesheetId: S,
      status: "submitted" }]);
    expect(buildPayInputs(src([], { timesheets: [] })).missingTimesheets)
      .toEqual([E]);
  });

  it("overtime_and_rest_day_from_decisions", () => {
    const e = one(src([d("2026-03-02", { overtimeMinutes: 120,
      overtimeNightMinutes: 60, decision: ot(90, 30) }),
    d("2026-03-04", { kind: "rest", restDayWorkMinutes: 240,
      decision: { ...ot(0), restDayWork: { approved: true,
        compensation: "pay" } } })]));
    expect(e.overtime).toEqual([{ date: "2026-03-02", minutes: 90,
      nightMinutes: 30 }]);
    expect(e.restDayWork).toEqual([{ date: "2026-03-04", kind: "rest-day",
      compensation: "pay" }]);
  });

  it("half_day_absence_manual", () => {
    const s = src([], { leaveDates: [{ employeeId: E, date: "2026-03-03",
      halves: 1, payrollKind: "unpaid" }] });
    expect(one(s).absences).toEqual([]);
    expect(codes(s)).toEqual(["HALF_DAY_ABSENCE"]);
  });

  it("work_on_absence_removed", () => {
    const s = src([d("2026-03-03", { decision: ot(30) })], { leaveDates: [
      { employeeId: E, date: "2026-03-03", halves: 2,
        payrollKind: "sick" }] });
    expect(one(s).overtime).toEqual([]);
    expect(one(s).absences).toEqual([]);
    expect(codes(s)).toEqual(["WORK_ON_ABSENCE_DATE"]);
  });

  it("outside_service_removed", () => {
    const s = src([d("2026-03-02", { decision: ot(30) })], { employees: [{
      employeeId: E, joiningDate: "2026-03-10", lastWorkingDate: null }] });
    expect(one(s).overtime).toEqual([]);
    expect(codes(s)).toEqual(["DATE_OUTSIDE_SERVICE"]);
  });

  it("unrecorded_absence_never_deducted", () => {
    const out = buildPayInputs(src([d("2026-03-05", { records: [] })]));
    expect(out.flagsNotDeducted).toEqual([{ employeeId: E,
      date: "2026-03-05", code: "UNRECORDED_ABSENCE" }]);
    expect(out.employees[0]!.absences).toEqual([]);
  });

  it("counters", () => {
    const s = src([], { sickHalvesBefore: { [E]: 5 },
      maternityRunBefore: { [E]: 4 } });
    expect(one(s).sickDaysUsedBefore).toBe(2);
    expect(one(s).maternityDaysUsedBefore).toBe(4);
    expect(codes(s)).toEqual(["SICK_COUNTER_HAS_HALF_DAYS"]);
  });

  it("pay_inputs_unique_dates", () => {
    const date = fc.integer({ min: 1, max: 31 }).map((n) =>
      `2026-03-${String(n).padStart(2, "0")}`);
    const dayArb = fc.record({ date, ot: fc.integer({ min: 0, max: 200 }),
      rest: fc.boolean() }).map((x) => d(x.date, {
      kind: x.rest ? "rest" : "work", decision: { ...ot(x.ot),
        restDayWork: x.rest ? { approved: true, compensation: "pay" }
          : null } }));
    const leaveArb = fc.record({ date, halves: fc.constantFrom(1, 2),
      kind: fc.constantFrom("sick", "unpaid", "maternity", "annual") });
    fc.assert(fc.property(fc.uniqueArray(dayArb, { selector: (x) => x.date,
      maxLength: 20 }), fc.uniqueArray(leaveArb, { selector: (x) => x.date,
      maxLength: 10 }), (days, leave) => {
      const e = one(src(days, { leaveDates: leave.map((l) => ({
        employeeId: E, date: l.date, halves: l.halves as 1 | 2,
        payrollKind: l.kind })) }));
      const all = [...e.absences, ...e.overtime, ...e.restDayWork]
        .map((x) => x.date);
      const perArray = [e.absences, e.overtime, e.restDayWork];
      const absent = new Set(e.absences.map((x) => x.date));
      for (const x of [...e.overtime, ...e.restDayWork]) {
        expect(absent.has(x.date)).toBe(false);
      }
      for (const a of perArray) {
        expect(new Set(a.map((x) => x.date)).size).toBe(a.length);
      }
      for (const x of all) expect(x.startsWith("2026-03-")).toBe(true);
    }), { numRuns: 200 });
  });
});

describe("pay inputs route", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "pin");
    await keepSessions(ctx);
  });
  it("pay_inputs_route", async () => {
    const as = asUser(ctx, s);
    const r = await as(s.hr, "GET", "/v1/time/pay-inputs?year=2026&month=3");
    expect(r.status, r.text).toBe(200);
    expect(r.body.statement).toMatch(/^Time inputs for review\./);
    expect(r.body.missingTimesheets.length).toBe(4);
    const m = await as(s.manager, "GET",
      "/v1/time/pay-inputs?year=2026&month=3");
    expect(m.status).toBe(403);
  });
});
