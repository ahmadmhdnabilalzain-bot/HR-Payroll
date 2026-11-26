import { Goal } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "goals");
});

describe("goals and check-ins", () => {
  it("goal_employee_creates_own", async () => {
    const r = await by(s.employee, "POST", "/v1/goals",
      { title: "Finish onboarding course" });
    expect(r.status, r.text).toBe(201);
    expect(r.body.employeeId).toBe(s.emp.report);
    expect(r.body.lastCheckIn).toBeNull();
  });

  it("goal_employee_cannot_create_for_other", async () => {
    const r = await by(s.employee, "POST", "/v1/goals",
      { title: "x", employeeId: s.emp.report2 });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
  });

  it("goal_manager_reports_only", async () => {
    const g = await by(s.hr, "POST", "/v1/goals",
      { title: "Outsider goal", employeeId: s.emp.outsider });
    expect(g.status).toBe(201);
    const r = await by(s.manager, "GET", `/v1/goals/${g.body.id}`);
    expect(r.status).toBe(404);
    const mine = await by(s.manager, "POST", "/v1/goals",
      { title: "Report goal", employeeId: s.emp.report2 });
    expect(mine.status).toBe(201);
    const bad = await by(s.manager, "POST", "/v1/goals",
      { title: "x", employeeId: s.emp.outsider });
    expect(bad.status).toBe(404);
  });

  it("goal_checkin_progress_bounds", async () => {
    const g = await by(s.employee, "POST", "/v1/goals", { title: "Bounds" });
    const r = await by(s.employee, "POST", `/v1/goals/${g.body.id}/check-ins`,
      { progress: 101 });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("goal_checkin_closed_409", async () => {
    const g = await by(s.manager, "POST", "/v1/goals",
      { title: "Ship it", employeeId: s.emp.report });
    const ok = await by(s.employee, "POST",
      `/v1/goals/${g.body.id}/check-ins`, { progress: 50, note: "half" });
    expect(ok.status, ok.text).toBe(201);
    const u = await by(s.manager, "PATCH", `/v1/goals/${g.body.id}`,
      { status: "achieved" });
    expect(u.status, u.text).toBe(200);
    const r = await by(s.employee, "POST",
      `/v1/goals/${g.body.id}/check-ins`, { progress: 60 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("GOAL_CLOSED");
    const e = await by(s.employee, "PATCH", `/v1/goals/${g.body.id}`,
      { title: "changed" });
    expect(e.status).toBe(403);
  });

  it("goal_last_checkin_in_list", async () => {
    const g = await by(s.employee, "POST", "/v1/goals", { title: "List" });
    await by(s.employee, "POST", `/v1/goals/${g.body.id}/check-ins`,
      { progress: 10 });
    ctx.clock.advance(60_000);
    await by(s.employee, "POST", `/v1/goals/${g.body.id}/check-ins`,
      { progress: 30 });
    const l = await by(s.employee, "GET", "/v1/goals");
    const item = l.body.items.find((x: { id: string }) =>
      x.id === g.body.id);
    expect(item.lastCheckIn.progress).toBe(30);
    expect(item.checkIns).toEqual([]);
    const one = await by(s.employee, "GET", `/v1/goals/${g.body.id}`);
    expect(one.body.checkIns.map((c: { progress: number }) => c.progress))
      .toEqual([10, 30]);
  });

  it("goal_no_pay_fields", () => {
    for (const k of Object.keys(Goal.shape)) {
      expect(k).not.toMatch(/amount|bonus|salary|rating|score/);
    }
  });
});
