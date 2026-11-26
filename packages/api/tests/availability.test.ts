import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime, type TimeSeed } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("team availability", () => {
  let ctx: Ctx;
  let s: Seeded;
  let t: TimeSeed;
  let as: ReturnType<typeof asUser>;
  let dept: string;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "avail");
    t = await seedTime(ctx, s);
    as = asUser(ctx, s);
    dept = (await as(s.hr, "POST", "/v1/departments", { name: "Ops" }))
      .body.id;
    for (const e of [s.emp.manager, s.emp.report]) {
      await as(s.hr, "PATCH", `/v1/employees/${e}`, { departmentId: dept });
    }
    const st = await as(s.hr, "PUT", `/v1/departments/${dept}/staffing`,
      { minOnDuty: 2 });
    expect(st.status, st.text).toBe(200);
  });

  it("leave_request_warns_below_staffing", async () => {
    const r = await as(s.employee, "POST", "/v1/leave-requests", {
      leaveTypeId: t.annualTypeId, startDate: "2026-03-02",
      endDate: "2026-03-02" });
    expect(r.status, r.text).toBe(201);
    const w = r.body.warnings.find((x: { code: string }) =>
      x.code === "BELOW_STAFFING");
    expect(w.dates).toEqual(["2026-03-02"]);
    await as(s.manager, "POST", `/v1/leave-requests/${r.body.id}/approve`,
      {});
  });

  it("below_minimum_counts_only", async () => {
    const r = await as(s.employee, "GET",
      "/v1/time/availability?from=2026-03-02&to=2026-03-02");
    expect(r.status, r.text).toBe(200);
    expect(r.body.items).toEqual([{ date: "2026-03-02", departmentId: dept,
      scheduled: 2, onLeave: 1, available: 1, minOnDuty: 2,
      belowMinimum: true }]);
    expect(r.text).not.toContain("Person");
  });
});
