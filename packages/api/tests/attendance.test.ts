import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
type Who = "owner" | "hr" | "manager" | "employee";

describe("attendance", () => {
  let ctx: Ctx;
  let s: Seeded;
  const as = (who: Who, method: string, path: string, body?: unknown) =>
    call(ctx.app, s[who].token, s.companyId, method, path, body);
  beforeAll(async () => {
    // Sessions last 8 hours: start late enough for a 20:30Z clock-in.
    ctx = await makeApp({ start: "2026-03-01T15:00:00.000Z" });
    s = await seedCompany(ctx, "att");
  });

  it("clock in and out in Dubai time", async () => {
    ctx.clock.now = new Date("2026-03-01T20:30:00.000Z");
    const i = await as("employee", "POST", "/v1/attendance/clock-in");
    expect(i.status, i.text).toBe(201);
    expect(i.body.date).toBe("2026-03-02");
    expect(i.body.clockOut).toBeNull();
    const again = await as("employee", "POST", "/v1/attendance/clock-in");
    expect(again.body.error.code).toBe("ALREADY_CLOCKED_IN");
    ctx.clock.advance(90 * 60_000 + 59_000);
    const o = await as("employee", "POST", "/v1/attendance/clock-out");
    expect(o.status, o.text).toBe(200);
    expect(o.body.minutes).toBe(90);
    const none = await as("employee", "POST", "/v1/attendance/clock-out");
    expect(none.body.error.code).toBe("NOT_CLOCKED_IN");
  });

  it("clocking needs an employee link", async () => {
    const r = await as("owner", "POST", "/v1/attendance/clock-in");
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("NO_EMPLOYEE_LINK");
  });

  it("manager sees self and reports only", async () => {
    await as("manager", "POST", "/v1/attendance/clock-in");
    const r = await as("manager", "GET",
      "/v1/attendance?from=2026-01-01&to=2026-12-31");
    expect(r.status, r.text).toBe(200);
    const ids = new Set(r.body.items.map((x: { employeeId: string }) =>
      x.employeeId));
    expect([...ids].sort()).toEqual([s.emp.manager, s.emp.report].sort());
    const e = await as("employee", "GET",
      `/v1/attendance?from=2026-01-01&to=2026-12-31&employeeId=${
        s.emp.manager}`);
    expect(e.body.items).toEqual([]);
  });

  it("hr corrects a record and the change is audited", async () => {
    const list = await as("hr", "GET",
      `/v1/attendance?from=2026-03-01&to=2026-03-31&employeeId=${
        s.emp.report}`);
    const rec = list.body.items[0];
    const bad = await as("hr", "PUT", `/v1/attendance/${rec.id}`, {
      clockIn: "2026-03-02T05:00:00.000Z",
      clockOut: "2026-03-02T04:00:00.000Z", note: "typo fix" });
    expect(bad.status).toBe(400);
    const ok = await as("hr", "PUT", `/v1/attendance/${rec.id}`, {
      clockIn: "2026-03-02T05:00:00.000Z",
      clockOut: "2026-03-02T13:00:00.000Z", note: "forgot to clock" });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body).toMatchObject({ minutes: 480, source: "hr" });
    const ev = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => tx.query<{ data: Record<string, string> }>(
      "SELECT data FROM audit_events WHERE action = 'attendance.corrected'"));
    expect(ev[0]?.data).toMatchObject({
      newClockIn: "2026-03-02T05:00:00.000Z",
      oldClockIn: rec.clockIn });
  });
});
