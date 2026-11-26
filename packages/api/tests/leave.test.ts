import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { unpaidLeaveDaysIn } from "../src/leave/balances";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
type Who = "owner" | "hr" | "manager" | "employee";

describe("leave", () => {
  let ctx: Ctx;
  let s: Seeded;
  let annual: string;
  let unpaid: string;
  const as = (who: Who, method: string, path: string, body?: unknown) =>
    call(ctx.app, s[who].token, s.companyId, method, path, body);
  const balance = async (emp: string) => {
    const r = await as("hr", "GET",
      `/v1/employees/${emp}/leave-balances?year=2026`);
    expect(r.status, r.text).toBe(200);
    return r.body.items.find((b: { leaveTypeId: string }) =>
      b.leaveTypeId === annual);
  };
  const request = (who: Who, body: Record<string, unknown>) =>
    as(who, "POST", "/v1/leave-requests", { leaveTypeId: annual, ...body });

  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "leave");
    annual = (await as("hr", "POST", "/v1/leave-types", { name: "Annual",
      paid: true, annualDays: 30 })).body.id;
    unpaid = (await as("hr", "POST", "/v1/leave-types", { name: "Unpaid",
      paid: false, annualDays: null })).body.id;
  });

  it("balance: entitled, adjustments, pending, taken", async () => {
    const adj = await as("hr", "POST", "/v1/leave-adjustments", {
      employeeId: s.emp.report, leaveTypeId: annual, year: 2026, days: 2,
      reason: "carried over" });
    expect(adj.status, adj.text).toBe(201);
    let b = await balance(s.emp.report);
    expect(b).toMatchObject({ entitledDays: 30, adjustmentDays: 2,
      remainingDays: 32, dayCountRule: "calendar-days-inclusive" });
    const r = await request("employee", { startDate: "2026-04-05",
      endDate: "2026-04-09" });
    expect(r.status, r.text).toBe(201);
    expect(r.body.days).toBe(5);
    b = await balance(s.emp.report);
    expect(b).toMatchObject({ pendingDays: 5, remainingDays: 27 });
    const ok = await as("manager", "POST",
      `/v1/leave-requests/${r.body.id}/approve`, {});
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.status).toBe("approved");
    b = await balance(s.emp.report);
    expect(b).toMatchObject({ takenDays: 5, pendingDays: 0,
      remainingDays: 27 });
    const again = await as("manager", "POST",
      `/v1/leave-requests/${r.body.id}/approve`, {});
    expect(again.body.error.code).toBe("LEAVE_NOT_PENDING");
  });

  it("refuses overlap, too many days, and year crossing", async () => {
    const overlap = await request("employee", { startDate: "2026-04-08",
      endDate: "2026-04-12" });
    expect(overlap.body.error.code).toBe("LEAVE_OVERLAP");
    const tooMany = await request("employee", { startDate: "2026-06-01",
      endDate: "2026-07-10" });
    expect(tooMany.body.error.code).toBe("INSUFFICIENT_BALANCE");
    const cross = await request("employee", { startDate: "2026-12-30",
      endDate: "2027-01-02" });
    expect(cross.body.error.code).toBe("LEAVE_CROSSES_YEAR");
    const back = await request("employee", { startDate: "2026-05-02",
      endDate: "2026-05-01" });
    expect(back.status).toBe(400);
    expect(back.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("who decides and who requests", async () => {
    const own = await request("manager", { startDate: "2026-08-01",
      endDate: "2026-08-02" });
    expect(own.status, own.text).toBe(201);
    const sod = await as("manager", "POST",
      `/v1/leave-requests/${own.body.id}/approve`, {});
    expect(sod.body.error.code).toBe("SOD_VIOLATION");
    const out = await request("hr", { employeeId: s.emp.outsider,
      startDate: "2026-08-01", endDate: "2026-08-01" });
    expect(out.status, out.text).toBe(201);
    const nonReport = await as("manager", "POST",
      `/v1/leave-requests/${out.body.id}/approve`, {});
    expect(nonReport.status).toBe(404);
    const forOther = await request("employee", {
      employeeId: s.emp.outsider, startDate: "2026-09-01",
      endDate: "2026-09-01" });
    expect(forOther.status).toBe(403);
    expect(forOther.body.error.code).toBe("FORBIDDEN");
  });

  it("cancel: own pending; hr any; reject by hr", async () => {
    const r = await request("employee", { startDate: "2026-10-01",
      endDate: "2026-10-01" });
    const c = await as("employee", "POST",
      `/v1/leave-requests/${r.body.id}/cancel`);
    expect(c.body.status).toBe("cancelled");
    const twice = await as("hr", "POST",
      `/v1/leave-requests/${r.body.id}/cancel`);
    expect(twice.body.error.code).toBe("LEAVE_NOT_CANCELLABLE");
    const r2 = await request("employee", { startDate: "2026-10-05",
      endDate: "2026-10-05" });
    const rej = await as("hr", "POST",
      `/v1/leave-requests/${r2.body.id}/reject`, { note: "busy" });
    expect(rej.body.status).toBe("rejected");
  });

  it("unpaid leave days in a month come from approved unpaid types",
    async () => {
      const r = await as("hr", "POST", "/v1/leave-requests", {
        employeeId: s.emp.outsider, leaveTypeId: unpaid,
        startDate: "2026-01-30", endDate: "2026-02-02" });
      expect(r.status, r.text).toBe(201);
      await as("hr", "POST", `/v1/leave-requests/${r.body.id}/approve`, {});
      const n = await withTenant(ctx.deps.db, { companyId: s.companyId,
        userId: null }, (tx) => unpaidLeaveDaysIn(tx, s.companyId,
        s.emp.outsider, { year: 2026, month: 2 }));
      expect(n).toBe(2);
    });

  it("lists by scope and filters by year", async () => {
    const e = await as("employee", "GET", "/v1/leave-requests?year=2026");
    expect(e.status, e.text).toBe(200);
    expect(e.body.items.every((x: { employeeId: string }) =>
      x.employeeId === s.emp.report)).toBe(true);
    const m = await as("manager", "GET", "/v1/leave-requests");
    const ids = new Set(m.body.items.map((x: { employeeId: string }) =>
      x.employeeId));
    expect(ids.has(s.emp.outsider)).toBe(false);
    const none = await as("hr", "GET", "/v1/leave-requests?year=2025");
    expect(none.body.items).toEqual([]);
  });
});
