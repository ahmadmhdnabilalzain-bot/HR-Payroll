import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const T = "/v1/time/timesheets";
const PI = "/v1/time/pay-inputs?year=2026&month=3";

describe("overtime decisions end to end (review N8)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let sheetId: string;
  let recordId: string;
  let shiftId: string;
  const day = (b: { days: { date: string }[] }, d: string) =>
    b.days.find((x) => x.date === d) as Record<string, any>;
  const mine = async () => {
    const p = await as(s.hr, "GET", PI);
    expect(p.status, p.text).toBe(200);
    return p.body.employees.find((e: { employeeId: string }) =>
      e.employeeId === s.emp.report);
  };
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-03-02T04:00:00.000Z" });
    s = await seedCompany(ctx, "rri1");
    shiftId = (await seedTime(ctx, s)).shiftId;
    as = asUser(ctx, s);
    // 09:00-19:00 Dubai on a 09:00-17:00 shift (overtime).
    ctx.clock.now = new Date("2026-03-02T05:00:00.000Z");
    recordId = (await as(s.employee, "POST", "/v1/attendance/clock-in"))
      .body.id;
    ctx.clock.now = new Date("2026-03-02T15:00:00.000Z");
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    // Work on the rest day 2026-03-04 (Wednesday).
    ctx.clock.now = new Date("2026-03-04T05:00:00.000Z");
    await as(s.employee, "POST", "/v1/attendance/clock-in");
    ctx.clock.now = new Date("2026-03-04T09:00:00.000Z");
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    ctx.clock.now = new Date("2026-04-02T08:00:00.000Z");
    await keepSessions(ctx);
    sheetId = (await as(s.employee, "POST", T, { year: 2026, month: 3 }))
      .body.id;
  });

  it("approve with 120, reopen, correct to no overtime, resubmit", async () => {
    const sub = await as(s.employee, "POST", `${T}/${sheetId}/submit`);
    expect(sub.status, sub.text).toBe(200);
    const ot = day(sub.body, "2026-03-02").overtimeMinutes;
    const rest = day(sub.body, "2026-03-04");
    expect(rest.kind).toBe("rest");
    expect(rest.restDayWorkMinutes).toBeGreaterThan(0);
    const d = await as(s.manager, "POST", `${T}/${sheetId}/overtime`, {
      days: [{ date: "2026-03-02", approvedMinutes: ot,
        approvedNightMinutes: 0 },
      { date: "2026-03-04", approvedMinutes: rest.overtimeMinutes,
        approvedNightMinutes: 0,
        restDayWork: { approved: true, compensation: "pay" } }] });
    expect(d.status, d.text).toBe(200);
    const ok = await as(s.manager, "POST", `${T}/${sheetId}/approve`);
    expect(ok.status, ok.text).toBe(200);
    const before = await mine();
    expect(before.overtime.find((x: { date: string }) =>
      x.date === "2026-03-02").minutes).toBe(ot);
    expect(before.restDayWork.length).toBe(1);

    const re = await as(s.owner, "POST", `${T}/${sheetId}/reopen`,
      { note: "check" });
    expect(re.status, re.text).toBe(200);
    const put = await as(s.hr, "PUT", `/v1/attendance/${recordId}`, {
      clockIn: "2026-03-02T05:00:00.000Z",
      clockOut: "2026-03-02T13:00:00.000Z", note: "no overtime" });
    expect(put.status, put.text).toBe(200);
    // The rest day becomes a work day on the roster.
    const r = await as(s.hr, "PUT", "/v1/time/roster", { entries: [{
      employeeId: s.emp.report, date: "2026-03-04",
      slot: { kind: "shift", shiftTemplateId: shiftId } }] });
    expect(r.status, r.text).toBe(200);
    const pub = await as(s.hr, "POST", "/v1/time/roster/publish", {
      from: "2026-03-04", to: "2026-03-04" });
    expect(pub.status, pub.text).toBe(200);

    const sub2 = await as(s.employee, "POST", `${T}/${sheetId}/submit`);
    expect(sub2.status, sub2.text).toBe(200);
    expect(day(sub2.body, "2026-03-02").overtimeMinutes).toBe(0);
    expect(day(sub2.body, "2026-03-02").decision).toBeNull();
    expect(day(sub2.body, "2026-03-04").kind).toBe("work");
    expect(day(sub2.body, "2026-03-04").decision).toBeNull();
    const ok2 = await as(s.manager, "POST", `${T}/${sheetId}/approve`);
    const after = await mine();
    expect(ok2.status, ok2.text).toBe(200);
    expect(after.overtime).toEqual([]);
    expect(after.restDayWork).toEqual([]);
  });

  it("approve refuses a stored decision larger than the frozen day",
    async () => {
      const re = await as(s.owner, "POST", `${T}/${sheetId}/reopen`,
        { note: "again" });
      expect(re.status, re.text).toBe(200);
      const sub = await as(s.employee, "POST", `${T}/${sheetId}/submit`);
      expect(sub.status, sub.text).toBe(200);
      // A decision written past the API (the backstop's only way in).
      await ctx.deps.db.query(
        `INSERT INTO overtime_decisions (company_id, timesheet_id, date,
           approved_minutes, approved_night_minutes, decided_by, decided_at)
         VALUES ($1, $2, '2026-03-02', 999, 0, $3, now())
         ON CONFLICT (timesheet_id, date) DO UPDATE SET
           approved_minutes = 999, voided_at = NULL`,
        [s.companyId, sheetId, s.manager.userId]);
      const r = await as(s.manager, "POST", `${T}/${sheetId}/approve`);
      expect(r.status).toBe(422);
      expect(r.body.error.code).toBe("OVERTIME_DECISION_INVALID");
      expect(r.body.error.detail.dates).toEqual(["2026-03-02"]);
  });
});
