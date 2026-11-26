import { loadTimeParams, TIME_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import {
  asUser,
  keepSessions,
  policy,
  seedTime,
  type TimeSeed,
} from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const P = loadTimeParams(TIME_PACKS[0]!, undefined);

describe("leave policies", () => {
  let ctx: Ctx;
  let s: Seeded;
  let t: TimeSeed;
  let as: ReturnType<typeof asUser>;
  const newType = async (name: string, annualDays: number | null,
    paid = true) => (await as(s.hr, "POST", "/v1/leave-types", { name,
    paid, annualDays })).body.id as string;
  const balance = async (typeId: string) => (await as(s.hr, "GET",
    `/v1/employees/${s.emp.report}/leave-balances?year=2026`)).body.items
    .find((b: { leaveTypeId: string }) => b.leaveTypeId === typeId);
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "lpol");
    t = await seedTime(ctx, s);
    as = asUser(ctx, s);
  });

  it("default_policy_matches_plan3", async () => {
    const id = await newType("Type D", 30);
    const p = await as(s.employee, "GET", `/v1/leave-types/${id}/policy`);
    expect(p.status, p.text).toBe(200);
    expect(p.body).toMatchObject({ isDefault: true, dayCount: "calendar",
      payrollKind: "other-paid", halfDays: false });
    expect(await balance(id)).toMatchObject({ entitledDays: 30,
      remainingDays: 30, takenDays: 0, pendingDays: 0,
      dayCountRule: "calendar-days-inclusive" });
  });

  it("policy_warnings_from_engine", async () => {
    const id = await newType("Type B", P.annualLeaveMinDays.v - 1);
    const r = await as(s.hr, "PUT", `/v1/leave-types/${id}/policy`,
      policy({ payrollKind: "annual" }));
    expect(r.status, r.text).toBe(200);
    const w = r.body.warnings.find((x: { code: string }) =>
      x.code === "ANNUAL_BELOW_STATUTORY");
    expect(w.rule.key).toBe("timeAnnualLeaveMinDays");
    expect(w.rule.status).toBe(P.annualLeaveMinDays.rule.status);
    expect(r.body.isDefault).toBe(false);
  });

  it("monthly_accrual_balance", async () => {
    ctx.clock.now = new Date("2026-03-31T10:00:00.000Z");
    const b = await balance(t.annualTypeId);
    expect(b.accruedToDate).toBe(7.5);
    expect(b.accrual).toBe("monthly");
    expect(b.dayCountRule).toBe("calendar-days-inclusive");
    ctx.clock.now = new Date("2026-03-01T10:00:00.000Z");
  });

  it("working_basis_needs_rest_days", async () => {
    const fresh = await seedCompany(ctx, "lpolw");
    await keepSessions(ctx);
    const f = asUser(ctx, fresh);
    const lt = await f(fresh.hr, "POST", "/v1/leave-types", {
      name: "Type W", paid: true, annualDays: 30 });
    await f(fresh.hr, "PUT", `/v1/leave-types/${lt.body.id}/policy`,
      policy({ dayCount: "working" }));
    const r = await f(fresh.employee, "POST", "/v1/leave-requests", {
      leaveTypeId: lt.body.id, startDate: "2026-05-04",
      endDate: "2026-05-05" });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("REST_DAYS_NOT_SET");
  });

  it("blackout_block_and_override", async () => {
    const b = await as(s.hr, "POST", "/v1/leave-blackouts", {
      name: "Test period", from: "2026-05-10", to: "2026-05-12",
      leaveTypeIds: [], departmentId: null, mode: "block" });
    expect(b.status, b.text).toBe(201);
    const body = { leaveTypeId: t.annualTypeId, startDate: "2026-05-11",
      endDate: "2026-05-11" };
    const no = await as(s.employee, "POST", "/v1/leave-requests", body);
    expect(no.status).toBe(422);
    expect(no.body.error.code).toBe("LEAVE_BLACKOUT");
    expect(no.body.error.detail.dates).toEqual(["2026-05-11"]);
    const self = await as(s.employee, "POST", "/v1/leave-requests",
      { ...body, overrideBlackout: true });
    expect(self.status).toBe(422);
    const hr = await as(s.hr, "POST", "/v1/leave-requests", { ...body,
      employeeId: s.emp.report, overrideBlackout: true });
    expect(hr.status, hr.text).toBe(201);
    expect(hr.body.warnings.map((w: { code: string }) => w.code))
      .toContain("BLACKOUT_OVERRIDDEN");
    const ev = await ctx.deps.db.query("SELECT 1 FROM audit_events WHERE " +
      "action = 'leave.blackout-overridden'");
    expect(ev.length).toBe(1);
  });

  it("preview_shows_skipped_holiday", async () => {
    const id = await newType("Type W", 30);
    await as(s.hr, "PUT", `/v1/leave-types/${id}/policy`,
      policy({ dayCount: "working" }));
    const before = await ctx.deps.db.query("SELECT id FROM leave_requests");
    const r = await as(s.employee, "POST", "/v1/leave-requests/preview", {
      leaveTypeId: id, startDate: "2026-03-19", endDate: "2026-03-21" });
    expect(r.status, r.text).toBe(200);
    expect(r.body.skipped).toContainEqual({ date: "2026-03-20",
      why: "holiday" });
    expect(r.body.days).toBe(2);
    expect(r.body.warnings.map((w: { code: string }) => w.code))
      .toContain("HOLIDAYS_EXCLUDED");
    const after = await ctx.deps.db.query("SELECT id FROM leave_requests");
    expect(after.length).toBe(before.length);
  });

  it("paid_flag_and_payroll_kind_agree", async () => {
    const paid = await newType("Type P9", 30);
    const a = await as(s.hr, "PUT", `/v1/leave-types/${paid}/policy`,
      policy({ payrollKind: "unpaid" }));
    expect(a.status).toBe(422);
    expect(a.body.error.code).toBe("LEAVE_POLICY_INVALID");
    const unpaid = await newType("Type U9", null, false);
    const b = await as(s.hr, "PUT", `/v1/leave-types/${unpaid}/policy`,
      policy({ payrollKind: "sick" }));
    expect(b.status).toBe(422);
    const ok = await as(s.hr, "PUT", `/v1/leave-types/${unpaid}/policy`,
      policy({ payrollKind: "unpaid" }));
    expect(ok.status, ok.text).toBe(200);
    const flip = await as(s.hr, "PATCH", `/v1/leave-types/${unpaid}`,
      { paid: true });
    expect(flip.status).toBe(422);
    expect(flip.body.error.code).toBe("LEAVE_POLICY_INVALID");
  });

  it("carry_over_on_no_balance_type", async () => {
    const id = await newType("Type N", null);
    const r = await as(s.hr, "PUT", `/v1/leave-types/${id}/policy`,
      policy({ carryOverMaxDays: 5 }));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("LEAVE_POLICY_INVALID");
  });
});
