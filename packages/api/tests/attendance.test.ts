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
    // Rows for the second report and the outsider, so dropping the scope
    // filter would show.
    await withTenant(ctx.deps.db, { companyId: s.companyId, userId: null },
      async (tx) => {
        for (const [n, id] of [[1, s.emp.report2], [2, s.emp.outsider]]) {
          await tx.query(
            `INSERT INTO attendance (id, company_id, employee_id, date,
               clock_in, clock_out, minutes, source, created_at)
             VALUES ($1, $2, $3, '2026-03-01', '2026-03-01T05:00:00Z',
               '2026-03-01T06:00:00Z', 60, 'hr', now())`,
            [`00000000-0000-4000-8000-0000000a000${n}`, s.companyId, id]);
        }
      });
    await as("manager", "POST", "/v1/attendance/clock-in");
    const r = await as("manager", "GET",
      "/v1/attendance?from=2026-01-01&to=2026-12-31");
    expect(r.status, r.text).toBe(200);
    const ids = new Set(r.body.items.map((x: { employeeId: string }) =>
      x.employeeId));
    expect([...ids].sort()).toEqual(
      [s.emp.manager, s.emp.report, s.emp.report2].sort());
    const own = await as("employee", "GET",
      "/v1/attendance?from=2026-01-01&to=2026-12-31");
    expect(new Set(own.body.items.map((x: { employeeId: string }) =>
      x.employeeId))).toEqual(new Set([s.emp.report]));
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
      clockIn: "2026-03-01T05:00:00.000Z",
      clockOut: "2026-03-01T04:00:00.000Z", note: "typo fix" });
    expect(bad.status).toBe(400);
    const ok = await as("hr", "PUT", `/v1/attendance/${rec.id}`, {
      clockIn: "2026-03-01T05:00:00.000Z",
      clockOut: "2026-03-01T13:00:00.000Z", note: "forgot to clock" });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body).toMatchObject({ minutes: 480, source: "hr" });
    const ev = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => tx.query<{ data: Record<string, string> }>(
      "SELECT data FROM audit_events WHERE action = 'attendance.corrected'"));
    expect(ev[0]?.data).toMatchObject({
      newClockIn: "2026-03-01T05:00:00.000Z",
      oldClockIn: rec.clockIn });
  });

  it("corrections and lists have limits", async () => {
    const list = await as("hr", "GET",
      `/v1/attendance?from=2026-03-01&to=2026-03-31&employeeId=${
        s.emp.manager}`);
    const open = list.body.items.find((x: { clockOut: string | null }) =>
      x.clockOut === null);
    expect(open).toBeDefined();
    const closed = await as("hr", "GET",
      `/v1/attendance?from=2026-03-01&to=2026-03-31&employeeId=${
        s.emp.report}`);
    const rec = closed.body.items[0];
    const put = (body: Record<string, unknown>, id = rec.id) =>
      as("hr", "PUT", `/v1/attendance/${id}`, { note: "fix it", ...body });
    const t = "2026-03-01T05:00:00.000Z";
    // Reopening while another record of the same person is open: 409.
    await as("employee", "POST", "/v1/attendance/clock-in");
    const reopen = await put({ clockIn: t, clockOut: null });
    expect(reopen.status).toBe(409);
    expect(reopen.body.error.code).toBe("ALREADY_CLOCKED_IN");
    const long = await put({ clockIn: "2026-02-27T05:00:00.000Z",
      clockOut: "2026-02-28T05:00:01.000Z" });
    expect(long.status).toBe(400);
    const future = await put({ clockIn: "2027-01-01T05:00:00.000Z",
      clockOut: "2027-01-01T06:00:00.000Z" });
    expect(future.status).toBe(400);
    const wide = await as("hr", "GET",
      "/v1/attendance?from=2025-01-01&to=2026-03-01");
    expect(wide.status).toBe(400);
    expect(wide.body.error.code).toBe("VALIDATION_FAILED");
  });
});
