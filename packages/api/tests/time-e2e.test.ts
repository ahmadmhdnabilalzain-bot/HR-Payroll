import { PAY_INPUTS_STATEMENT } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { seedCompany } from "./helpers/seed";
import { asUser, keepSessions, seedTime } from "./helpers/seed-time";
import { minutes, seedWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

const deg = (m: number) => m / 6371008.8 * 180 / Math.PI;

describe("time_attendance_end_to_end", () => {
  it("roster, geofenced clock, correction, timesheet, pay inputs, wfh",
    async () => {
      const ctx = await makeApp({ start: "2026-03-02T04:00:00.000Z" });
      const s = await seedCompany(ctx, "e2e");
      const t = await seedTime(ctx, s);
      const as = asUser(ctx, s);
      const ok = async (p: Promise<{ status: number; text: string;
        body: any }>, want = 200) => {
        const r = await p;
        expect(r.status, r.text).toBe(want);
        return r.body;
      };
      await ok(as(s.hr, "PUT", `/v1/employees/${s.emp.report}/time-profile`,
        { workMode: "hybrid", geofenceMode: "require",
          workSiteIds: [t.siteId], wfhTracked: true, shiftWorker: false }));
      // Phone clock-in inside Site A at 13:00 Dubai, out 00:30 next day.
      ctx.clock.now = new Date("2026-03-02T09:00:00.000Z");
      const i = await ok(as(s.employee, "POST", "/v1/attendance/clock-in", {
        method: "phone", location: { lat: 1.5 + deg(30), lng: 1.5,
          accuracyM: 10 } }), 201);
      expect(i.geofence.result).toBe("inside");
      ctx.clock.now = new Date("2026-03-02T20:30:00.000Z");
      const o = await ok(as(s.employee, "POST", "/v1/attendance/clock-out"));
      expect(o.date).toBe("2026-03-02");
      // A missed day, corrected with the manager's approval.
      const c = await ok(as(s.employee, "POST",
        "/v1/attendance/correction-requests", { date: "2026-03-03",
          clockIn: "2026-03-03T05:00:00.000Z",
          clockOut: "2026-03-03T13:00:00.000Z", reason: "Forgot" }), 201);
      await ok(as(s.manager, "POST",
        `/v1/attendance/correction-requests/${c.id}/approve`));
      // April: prepare, submit, decide, approve.
      ctx.clock.now = new Date("2026-04-02T08:00:00.000Z");
      await keepSessions(ctx);
      const sh = await ok(as(s.employee, "POST", "/v1/time/timesheets",
        { year: 2026, month: 3 }), 201);
      await ok(as(s.employee, "POST", `/v1/time/timesheets/${sh.id}/submit`));
      const full = await ok(as(s.manager, "GET",
        `/v1/time/timesheets/${sh.id}`));
      const d2 = full.days.find((d: { date: string }) =>
        d.date === "2026-03-02");
      expect(d2.overtimeMinutes).toBeGreaterThan(0);
      const decide = full.days.filter((d: { overtimeMinutes: number;
        restDayWorkMinutes: number }) => d.overtimeMinutes > 0 ||
        d.restDayWorkMinutes > 0).map((d: { date: string; kind: string;
        overtimeMinutes: number; overtimeNightMinutes: number }) => ({
        date: d.date, approvedMinutes: d.overtimeMinutes,
        approvedNightMinutes: d.overtimeNightMinutes,
        ...(d.kind === "work" ? {} : { restDayWork: { approved: true,
          compensation: "pay" } }) }));
      await ok(as(s.manager, "POST", `/v1/time/timesheets/${sh.id}/overtime`,
        { days: decide }));
      await ok(as(s.manager, "POST", `/v1/time/timesheets/${sh.id}/approve`));
      const pay = await ok(as(s.hr, "GET",
        "/v1/time/pay-inputs?year=2026&month=3"));
      expect(pay.statement).toBe(PAY_INPUTS_STATEMENT);
      const mine = pay.employees.find((e: { employeeId: string }) =>
        e.employeeId === s.emp.report);
      const ot = mine.overtime.find((x: { date: string }) =>
        x.date === "2026-03-02");
      expect(ot).toEqual({ date: "2026-03-02",
        minutes: d2.overtimeMinutes, nightMinutes: d2.overtimeNightMinutes });
      expect(ot.nightMinutes).toBeGreaterThan(0);
      // WFH: tracked, paused, an upload inside the pause refused,
      // the manager sees no coordinate, withdrawal erases.
      const w = await seedWfh(ctx, s);
      await ok(as(s.employee, "POST", "/v1/wfh/me/pause"));
      const inPause = new Date(Math.ceil(ctx.clock.now.getTime() / 60_000)
        * 60_000);
      ctx.clock.advance(3 * 60_000);
      await ok(as(s.employee, "POST", "/v1/wfh/me/resume"));
      const refused = await as(s.employee, "POST", "/v1/wfh/activity", {
        attendanceId: w.attendanceId, minutes: minutes(inPause, 1) });
      expect(refused.body.error.code).toBe("TRACKING_PAUSED");
      const sum = await ok(as(s.manager, "GET", `/v1/wfh/summary?from=${
        "2026-04-02"}&to=2026-04-02&employeeId=${s.emp.report}`));
      expect(JSON.stringify(sum)).not.toMatch(/1\.234|1\.432/);
      const wd = await ok(as(s.employee, "POST", "/v1/wfh/consent/withdraw",
        { erase: true }));
      expect(wd.erasedRows).toBe(11);
      expect((await ctx.deps.db.query(
        "SELECT 1 FROM wfh_activity_minutes")).length).toBe(0);
      const payAfter = await ok(as(s.hr, "GET",
        "/v1/time/pay-inputs?year=2026&month=3"));
      expect(payAfter).toEqual(pay);
      const v = await ok(as(s.owner, "GET", "/v1/audit-events/verify"));
      expect(v.ok).toBe(true);
    });
});
