import { computeDaySheet, loadTimeParams, TIME_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions, linkUser, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const T = "/v1/time/timesheets";
const P = loadTimeParams(TIME_PACKS[0]!, undefined);
/** The engine's own answer for a work day on the seeded shift. */
const expectedOvertime = (worked: [number, number]) => computeDaySheet({
  date: "2026-03-02", kind: "work", shift: { start: 540, end: 1020,
    breakMinutes: 60 }, worked: [{ start: worked[0], end: worked[1] }],
  openRecord: false, ramadan: false, leave: "none" }, P).overtimeMinutes;

describe("timesheets and overtime review", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let sheetId: string;
  let leaveId: string;
  let recordId: string;
  const day = (b: { days: { date: string }[] }, d: string) =>
    b.days.find((x) => x.date === d) as Record<string, any>;
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-03-02T04:00:00.000Z" });
    s = await seedCompany(ctx, "tsh");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    ctx.clock.now = new Date("2026-03-02T05:00:00.000Z");
    recordId = (await as(s.employee, "POST", "/v1/attendance/clock-in"))
      .body.id;
    ctx.clock.now = new Date("2026-03-02T15:00:00.000Z");
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    const lt = await as(s.hr, "POST", "/v1/leave-types", { name: "Type L",
      paid: false, annualDays: null });
    const lr = await as(s.hr, "POST", "/v1/leave-requests", { employeeId:
      s.emp.report, leaveTypeId: lt.body.id, startDate: "2026-03-10",
      endDate: "2026-03-10" });
    leaveId = lr.body.id;
    await as(s.owner, "POST", `/v1/leave-requests/${leaveId}/approve`, {});
    ctx.clock.now = new Date("2026-03-25T08:00:00.000Z");
    await keepSessions(ctx);
  });

  it("prepare_builds_days_from_roster_and_records", async () => {
    const r = await as(s.employee, "POST", T, { year: 2026, month: 3 });
    expect(r.status, r.text).toBe(201);
    sheetId = r.body.id;
    const d2 = day(r.body, "2026-03-02");
    expect(d2.overtimeMinutes).toBe(expectedOvertime([540, 1140]));
    expect(d2.overtimeMinutes).toBeGreaterThan(0);
    expect(d2.shift).toEqual({ start: "09:00", end: "17:00",
      breakMinutes: 60 });
    expect(day(r.body, "2026-03-20").kind).toBe("holiday");
    expect(day(r.body, "2026-03-04").kind).toBe("rest");
    expect(day(r.body, "2026-03-10").leave.part).toBe("full");
    expect(r.body.days.length).toBe(25);
  });

  it("prepare_twice_concurrently_one_timesheet", async () => {
    const body = { employeeId: s.emp.manager, year: 2026, month: 3 };
    const [a, b] = await Promise.all([as(s.hr, "POST", T, body),
      as(s.hr, "POST", T, body)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.id).toBe(b.body.id);
    const n = await ctx.deps.db.query<{ n: bigint }>("SELECT count(*) AS n " +
      "FROM timesheets WHERE employee_id = $1", [s.emp.manager]);
    expect(Number(n[0]!.n)).toBe(1);
  });

  it("submit_before_month_end_refused", async () => {
    const r = await as(s.employee, "POST", `${T}/${sheetId}/submit`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("PERIOD_NOT_ENDED");
    ctx.clock.now = new Date("2026-04-02T08:00:00.000Z");
    const ok = await as(s.employee, "POST", `${T}/${sheetId}/submit`);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.status).toBe("submitted");
    expect(ok.body.days.length).toBe(31);
  });

  it("overtime_decision_bounds", async () => {
    const over = expectedOvertime([540, 1140]) + 1;
    const r = await as(s.manager, "POST", `${T}/${sheetId}/overtime`, {
      days: [{ date: "2026-03-02", approvedMinutes: over,
        approvedNightMinutes: 0 }] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("OVERTIME_DECISION_INVALID");
    expect(r.body.error.detail.dates).toEqual(["2026-03-02"]);
  });

  it("approve_needs_all_decisions", async () => {
    const r = await as(s.manager, "POST", `${T}/${sheetId}/approve`);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("OVERTIME_UNDECIDED");
    expect(r.body.error.detail.dates).toContain("2026-03-02");
    const ot = expectedOvertime([540, 1140]);
    const d = await as(s.manager, "POST", `${T}/${sheetId}/overtime`, {
      days: [{ date: "2026-03-02", approvedMinutes: ot,
        approvedNightMinutes: 0 }] });
    expect(d.status, d.text).toBe(200);
    expect(d.body.totals.approvedOvertime).toBe(ot);
  });

  it("timesheet_sod", async () => {
    const own = await as(s.manager, "POST", T, { year: 2026, month: 3 });
    await as(s.manager, "POST", `${T}/${own.body.id}/submit`);
    const self = await as(s.manager, "POST", `${T}/${own.body.id}/approve`);
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe("SOD_VIOLATION");
    const ok = await as(s.manager, "POST", `${T}/${sheetId}/approve`);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.status).toBe("approved");
  });

  it("approved_timesheet_snapshot_unchanged_after_edit", async () => {
    const before = await as(s.hr, "GET", `${T}/${sheetId}`);
    const payBefore = await as(s.hr, "GET",
      "/v1/time/pay-inputs?year=2026&month=3");
    const put = await as(s.hr, "PUT", `/v1/attendance/${recordId}`, {
      clockIn: "2026-03-02T05:00:00.000Z",
      clockOut: "2026-03-02T16:00:00.000Z", note: "late fix" });
    expect(put.status).toBe(409);
    expect(put.body.error.code).toBe("TIMESHEET_LOCKED");
    const corr = await as(s.employee, "POST",
      "/v1/attendance/correction-requests", { date: "2026-03-03",
        clockIn: "2026-03-03T05:00:00.000Z",
        clockOut: "2026-03-03T13:00:00.000Z", reason: "missed" });
    expect(corr.status).toBe(409);
    const cancel = await as(s.hr, "POST",
      `/v1/leave-requests/${leaveId}/cancel`);
    expect(cancel.status, cancel.text).toBe(200);
    const after = await as(s.hr, "GET", `${T}/${sheetId}`);
    expect(after.body.stale).toBe(true);
    expect(after.body.days).toEqual(before.body.days);
    const payAfter = await as(s.hr, "GET",
      "/v1/time/pay-inputs?year=2026&month=3");
    const mine = (b: any) => b.employees.find((e: { employeeId: string }) =>
      e.employeeId === s.emp.report);
    expect(mine(payAfter.body).overtime).toEqual(mine(payBefore.body)
      .overtime);
    expect(mine(payAfter.body).absences).toEqual(mine(payBefore.body)
      .absences);
    expect(mine(payAfter.body).needsManualEntry.map((m: { code: string }) =>
      m.code)).toContain("TIMESHEET_STALE");
  });

  it("reopen_then_edit", async () => {
    const r = await as(s.owner, "POST", `${T}/${sheetId}/reopen`,
      { note: "fix a record" });
    expect(r.status, r.text).toBe(200);
    expect(r.body.status).toBe("draft");
    const put = await as(s.hr, "PUT", `/v1/attendance/${recordId}`, {
      clockIn: "2026-03-02T05:00:00.000Z",
      clockOut: "2026-03-02T16:00:00.000Z", note: "late fix" });
    expect(put.status, put.text).toBe(200);
  });

  it("wfh_hidden_from_peers", async () => {
    const peer = await linkUser(ctx, s, s.emp.outsider, "tshpeer");
    const r = await as(peer, "GET", `${T}/${sheetId}`);
    expect(r.status).toBe(404);
    const list = await as(peer, "GET", `${T}?year=2026&month=3`);
    expect(list.body.items).toEqual([]);
  });

  it("overlong_record_is_a_missed_clock_out_not_a_crash", async () => {
    await ctx.deps.db.query(
      `INSERT INTO attendance (id, company_id, employee_id, date, clock_in,
         clock_out, minutes, source, created_at) VALUES
       ('00000000-0000-4000-8000-00000000beef', $1, $2, '2026-03-05',
        '2026-03-05T05:00:00Z', '2026-03-07T11:00:00Z', 3240, 'hr',
        '2026-03-05T05:00:00Z')`, [s.companyId, s.emp.report]);
    const r = await as(s.hr, "GET", `${T}/${sheetId}`);
    expect(r.status, r.text).toBe(200);
    const d5 = day(r.body, "2026-03-05");
    const codes = d5.flags.map((f: { code: string }) => f.code);
    expect(codes).toContain("MISSED_CLOCK_OUT");
    expect(codes).toContain("RECORD_OVER_24_HOURS");
    expect(d5.overtimeMinutes).toBe(0);
  });

  it("clock_out_after_24_hours_refused", async () => {
    ctx.clock.now = new Date("2026-04-03T05:00:00.000Z");
    await as(s.employee, "POST", "/v1/attendance/clock-in");
    ctx.clock.now = new Date("2026-04-04T05:01:00.000Z");
    const r = await as(s.employee, "POST", "/v1/attendance/clock-out");
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("CLOCK_OUT_TOO_LATE");
  });
});
