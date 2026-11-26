import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions, policy } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("leave carry-over", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let typeId: string;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "carry");
    await keepSessions(ctx);
    as = asUser(ctx, s);
    typeId = (await as(s.hr, "POST", "/v1/leave-types", { name: "Type C",
      paid: true, annualDays: 30 })).body.id;
    await as(s.hr, "PUT", `/v1/leave-types/${typeId}/policy`, policy({
      payrollKind: "annual", carryOverMaxDays: 5,
      carryOverExpiresMonths: 3 }));
    const r = await as(s.employee, "POST", "/v1/leave-requests", {
      leaveTypeId: typeId, startDate: "2026-06-01", endDate: "2026-06-12" });
    await as(s.manager, "POST", `/v1/leave-requests/${r.body.id}/approve`,
      {});
  });
  const bal = async (year: number) => (await as(s.employee, "GET",
    `/v1/employees/${s.emp.report}/leave-balances?year=${year}`)).body
    .items.find((b: { leaveTypeId: string }) => b.leaveTypeId === typeId);

  it("carry_over_hr_only", async () => {
    const r = await as(s.manager, "POST", "/v1/leave-carry-over",
      { fromYear: 2026 });
    expect(r.status).toBe(403);
  });

  it("carry_over_twice_concurrently_once", async () => {
    const [a, b] = await Promise.all([1, 2].map(() => as(s.hr, "POST",
      "/v1/leave-carry-over", { fromYear: 2026 })));
    expect(a!.status, a!.text).toBe(200);
    expect([a!.body.alreadyRun, b!.body.alreadyRun].sort())
      .toEqual([false, true]);
    expect(a!.body.rows).toEqual(b!.body.rows);
    const n = await ctx.deps.db.query("SELECT 1 FROM leave_carryovers");
    expect(n.length).toBe(4);
  });

  it("carry_over_capped_with_expiry", async () => {
    ctx.clock.now = new Date("2027-01-15T08:00:00.000Z");
    const b = await bal(2027);
    expect(b.carriedDays).toBe(5);
    expect(b.carriedExpiresOn).toBe("2027-03-31");
    expect(b.expiredDays).toBe(0);
    ctx.clock.now = new Date("2027-04-01T08:00:00.000Z");
    const later = await bal(2027);
    expect(later.expiredDays).toBe(5);
  });
});
