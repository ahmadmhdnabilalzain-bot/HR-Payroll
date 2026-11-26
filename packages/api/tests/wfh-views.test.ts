import { beforeAll, describe, expect, it } from "vitest";
import { dubaiDate } from "../src/time/dubai";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions, seedTime } from "./helpers/seed-time";
import { plainSession, seedWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("wfh views", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let day: string;
  let payBefore: unknown;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wviw");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    payBefore = (await as(s.hr, "GET",
      "/v1/time/pay-inputs?year=2026&month=3")).body;
    const w = await seedWfh(ctx, s);
    day = dubaiDate(w.first);
  });
  const range = () => `from=${day}&to=${day}`;

  it("own_days_detail", async () => {
    const r = await as(s.employee, "GET", `/v1/wfh/me/days?${range()}`);
    expect(r.status, r.text).toBe(200);
    const d = r.body.items[0];
    expect(d.totals.activeMinutes).toBe(10);
    expect(d.totals.categories.documents).toBe(10);
    expect(d.hours.length).toBeGreaterThan(0);
    expect(d.locations[0]).toMatchObject({ lat: 1.234, lng: 1.432 });
    const x = await as(s.employee, "GET", "/v1/wfh/me/export");
    expect(x.status, x.text).toBe(200);
    expect(x.body.consents.length).toBeGreaterThan(0);
    expect(x.body.days.length).toBe(1);
    expect(Array.isArray(x.body.pauses)).toBe(true);
  });

  it("summary_totals_only", async () => {
    const r = await as(s.manager, "GET",
      `/v1/wfh/summary?${range()}&employeeId=${s.emp.report}`);
    expect(r.status, r.text).toBe(200);
    expect(r.body.items[0]).toMatchObject({ locationSamples: 1,
      totals: { activeMinutes: 10 } });
    expect(r.text).not.toMatch(/"lat"|"lng"|"hours"/);
    const out = await as(s.manager, "GET",
      `/v1/wfh/summary?${range()}&employeeId=${s.emp.outsider}`);
    expect(out.status).toBe(404);
  });

  it("locations_owner_hr_mfa", async () => {
    const q = `/v1/wfh/locations?${range()}&employeeId=${s.emp.report}`;
    const plain = await plainSession(ctx, s.hr.userId);
    const no = await as({ ...s.hr, token: plain }, "GET", q);
    expect(no.status).toBe(403);
    expect(no.body.error.code).toBe("MFA_REQUIRED");
    const ok = await as(s.hr, "GET", q);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.items[0]).toMatchObject({ lat: 1.234, lng: 1.432 });
    const ev = await ctx.deps.db.query(
      "SELECT data FROM audit_events WHERE action = 'wfh.locations.viewed'");
    expect(ev.length).toBe(1);
    expect(JSON.stringify(ev)).not.toContain("1.234");
    const m = await as(s.manager, "GET", q);
    expect(m.status).toBe(403);
  });

  it("timesheet_shows_wfh_totals", async () => {
    const sheet = await as(s.employee, "POST", "/v1/time/timesheets",
      { year: 2026, month: 3 });
    expect(sheet.status, sheet.text).toBe(201);
    const d = sheet.body.days.find((x: { date: string }) => x.date === day);
    expect(d.wfh.activeMinutes).toBe(10);
  });

  it("pay_inputs_ignore_wfh", async () => {
    await keepSessions(ctx);
    await ctx.deps.db.query("DELETE FROM timesheets WHERE employee_id = " +
      "$1 AND status = 'draft' AND NOT EXISTS (SELECT 1 FROM " +
      "overtime_decisions d WHERE d.timesheet_id = timesheets.id)",
    [s.emp.report]);
    const after = await as(s.hr, "GET",
      "/v1/time/pay-inputs?year=2026&month=3");
    expect(after.body).toEqual(payBefore);
  });
});
