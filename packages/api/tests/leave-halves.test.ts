import { computeDaySheet, loadTimeParams, TIME_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { unpaidLeaveDaysIn } from "../src/leave/balances";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, policy, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const LR = "/v1/leave-requests";

describe("half-day leave", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  const typeWith = async (name: string, annualDays: number | null,
    o: Record<string, unknown>, paid = true) => {
    const id = (await as(s.hr, "POST", "/v1/leave-types", { name, paid,
      annualDays })).body.id as string;
    await as(s.hr, "PUT", `/v1/leave-types/${id}/policy`, policy(o));
    return id;
  };
  const ask = (leaveTypeId: string, date: string, part: string) =>
    as(s.employee, "POST", LR, { leaveTypeId, startDate: date,
      endDate: date, startPart: part, endPart: part });
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "lhalf");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
  });

  it("half_day_needs_policy", async () => {
    const id = await typeWith("Type F", 30, {});
    const r = await ask(id, "2026-04-06", "am");
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("HALF_DAY_NOT_ALLOWED");
    const bad = await as(s.employee, "POST", LR, { leaveTypeId: id,
      startDate: "2026-04-06", endDate: "2026-04-06", startPart: "am",
      endPart: "pm" });
    expect(bad.status).toBe(422);
  });

  it("half_days_am_pm_same_date_no_overlap", async () => {
    const id = await typeWith("Type H", 30, { halfDays: true });
    const am = await ask(id, "2026-04-07", "am");
    expect(am.status, am.text).toBe(201);
    expect(am.body.days).toBe(0.5);
    const pm = await ask(id, "2026-04-07", "pm");
    expect(pm.status, pm.text).toBe(201);
    const again = await ask(id, "2026-04-07", "am");
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("LEAVE_OVERLAP");
  });

  it("half_day_balance", async () => {
    const id = await typeWith("Type H2", 10, { halfDays: true });
    const pm = await ask(id, "2026-04-09", "pm");
    await as(s.manager, "POST", `${LR}/${pm.body.id}/approve`, {});
    const b = await as(s.employee, "GET",
      `/v1/employees/${s.emp.report}/leave-balances?year=2026`);
    const row = b.body.items.find((x: { leaveTypeId: string }) =>
      x.leaveTypeId === id);
    expect(row.remainingDays).toBe(9.5);
    expect(row.takenDays).toBe(0.5);
  });

  it("half_day_unpaid_leave_counts_as_partial", async () => {
    const id = await typeWith("Type U", null, { halfDays: true,
      payrollKind: "unpaid" }, false);
    const am = await ask(id, "2026-04-08", "am");
    await as(s.manager, "POST", `${LR}/${am.body.id}/approve`, {});
    const n = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => unpaidLeaveDaysIn(tx, s.companyId,
      s.emp.report, { year: 2026, month: 4 }));
    expect(n).toBe(1);
    const run = await as(s.hr, "POST", "/v1/pay-runs", undefined);
    expect(run.status).toBe(400);
    const r = await ctx.app.request("/v1/pay-runs", { method: "POST",
      headers: { authorization: `Bearer ${s.hr.token}`,
        "x-company-id": s.companyId, "content-type": "application/json",
        "idempotency-key": "half-1" },
      body: JSON.stringify({ period: { year: 2026, month: 4 },
        entries: [] }) });
    const body = await r.json() as any;
    expect(r.status).toBe(422);
    expect(body.error.code).toBe("PAY_RUN_PROBLEMS");
    expect(JSON.stringify(body)).toContain("ENTERED_AMOUNTS_REQUIRED");
  });

  it("am_and_pm_of_two_types_keep_their_own_types", async () => {
    const u = await typeWith("Type U2", null, { halfDays: true,
      payrollKind: "unpaid" }, false);
    const p = await typeWith("Type P2", 30, { halfDays: true,
      payrollKind: "annual" });
    for (const [id, part] of [[u, "am"], [p, "pm"]] as const) {
      const r = await ask(id, "2026-03-12", part);
      expect(r.status, r.text).toBe(201);
      await as(s.manager, "POST", `${LR}/${r.body.id}/approve`, {});
    }
    ctx.clock.now = new Date("2026-03-15T08:00:00.000Z");
    const sheet = await as(s.employee, "POST", "/v1/time/timesheets",
      { year: 2026, month: 3 });
    const d = sheet.body.days.find((x: { date: string }) =>
      x.date === "2026-03-12");
    expect(d.leave.part).toBe("full");
    expect(d.leave.parts.map((x: { part: string; payrollKind: string }) =>
      `${x.part}:${x.payrollKind}`).sort()).toEqual(["am:unpaid",
      "pm:annual"]);
  });

  it("timesheet_shows_half_day", async () => {
    const id = await typeWith("Type H3", 30, { halfDays: true });
    const am = await ask(id, "2026-03-05", "am");
    expect(am.status, am.text).toBe(201);
    await as(s.manager, "POST", `${LR}/${am.body.id}/approve`, {});
    ctx.clock.now = new Date("2026-03-10T08:00:00.000Z");
    const sheet = await as(s.employee, "POST", "/v1/time/timesheets",
      { year: 2026, month: 3 });
    const d = sheet.body.days.find((x: { date: string }) =>
      x.date === "2026-03-05");
    expect(d.leave.part).toBe("am");
    const want = computeDaySheet({ date: "2026-03-05", kind: "work",
      shift: { start: 540, end: 1020, breakMinutes: 60 }, worked: [],
      openRecord: false, ramadan: false, leave: "am" },
    loadTimeParams(TIME_PACKS[0]!, undefined)).scheduledMinutes;
    expect(d.scheduledMinutes).toBe(want);
  });
});
