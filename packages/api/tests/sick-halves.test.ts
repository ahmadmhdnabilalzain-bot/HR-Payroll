import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { loadPayInputSource } from "../src/time/pay-inputs-load";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, policy, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const LR = "/v1/leave-requests";

describe("sick counter with two half types on one date (review N2)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  const typeWith = async (name: string, annualDays: number | null,
    o: Record<string, unknown>, paid = true) => {
    const id = (await as(s.hr, "POST", "/v1/leave-types", { name, paid,
      annualDays })).body.id as string;
    const p = await as(s.hr, "PUT", `/v1/leave-types/${id}/policy`,
      policy(o));
    expect(p.status, p.text).toBe(200);
    return id;
  };
  const take = async (leaveTypeId: string, date: string, part: string) => {
    const r = await as(s.employee, "POST", LR, { leaveTypeId,
      startDate: date, endDate: date, startPart: part, endPart: part });
    expect(r.status, r.text).toBe(201);
    const a = await as(s.manager, "POST", `${LR}/${r.body.id}/approve`, {});
    expect(a.status, a.text).toBe(200);
  };
  const sickHalves = () => withTenant(ctx.deps.db, { companyId: s.companyId,
    userId: null }, async (tx) => (await loadPayInputSource(tx, s.companyId,
    2026, 3, "2026-04-15")).sickHalvesBefore[s.emp.report] ?? 0);
  let sick: string;
  let annual: string;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "rrsick");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    sick = await typeWith("Type S", 90, { halfDays: true,
      payrollKind: "sick" });
    annual = await typeWith("Type A", 30, { halfDays: true,
      payrollKind: "annual" });
  });

  it("sick am first, annual pm second: one sick half expected", async () => {
    await take(sick, "2026-02-10", "am");
    await take(annual, "2026-02-10", "pm");
    expect(await sickHalves()).toBe(1);
  });

  it("annual am first, sick pm second: one more sick half", async () => {
    const before = await sickHalves();
    await take(annual, "2026-02-11", "am");
    await take(sick, "2026-02-11", "pm");
    expect((await sickHalves()) - before).toBe(1);
  });

  it("unpaid half and annual half, both id orders, through pay inputs",
    async () => {
      const unpaid = await typeWith("Type U", null, { halfDays: true,
        payrollKind: "unpaid" }, false);
      await take(unpaid, "2026-03-10", "am");
      await take(annual, "2026-03-10", "pm");
      await take(annual, "2026-03-11", "am");
      await take(unpaid, "2026-03-11", "pm");
      ctx.clock.now = new Date("2026-04-02T08:00:00.000Z");
      const { keepSessions } = await import("./helpers/seed-time");
      await keepSessions(ctx);
      const sh = await as(s.employee, "POST", "/v1/time/timesheets",
        { year: 2026, month: 3 });
      const sub = await as(s.employee, "POST",
        `/v1/time/timesheets/${sh.body.id}/submit`);
      expect(sub.status, sub.text).toBe(200);
      const ok = await as(s.manager, "POST",
        `/v1/time/timesheets/${sh.body.id}/approve`);
      expect(ok.status, ok.text).toBe(200);
      const p = await as(s.hr, "GET", "/v1/time/pay-inputs?year=2026&month=3");
      const me = p.body.employees.find((e: { employeeId: string }) =>
        e.employeeId === s.emp.report);
      expect(me.absences).toEqual([]);
      expect(me.needsManualEntry.filter((x: { code: string }) =>
        x.code === "HALF_DAY_ABSENCE").map((x: { date: string }) => x.date)
        .sort()).toEqual(["2026-03-10", "2026-03-11"]);
    });
});
