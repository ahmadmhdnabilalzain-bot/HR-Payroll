import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const C = "/v1/attendance/correction-requests";

describe("attendance corrections", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  const day = (d: string, from: string, to: string | null) => ({
    date: d, clockIn: `${d}T${from}:00.000Z`,
    clockOut: to === null ? null : `${d}T${to}:00.000Z`,
    reason: "Forgot to clock in" });
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-03-20T08:00:00.000Z" });
    s = await seedCompany(ctx, "cor");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
  });

  it("correction_new_record_after_approval", async () => {
    const r = await as(s.employee, "POST", C, day("2026-03-02", "05:00",
      "13:00"));
    expect(r.status, r.text).toBe(201);
    expect(r.body.status).toBe("pending");
    const ok = await as(s.manager, "POST", `${C}/${r.body.id}/approve`);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.status).toBe("approved");
    const list = await as(s.employee, "GET",
      "/v1/attendance?from=2026-03-02&to=2026-03-02");
    expect(list.body.items[0]).toMatchObject({ source: "correction",
      minutes: 480 });
    const ev = await ctx.deps.db.query<{ data: unknown }>(
      "SELECT data FROM audit_events WHERE action = 'correction.approved'");
    expect(ev.length).toBe(1);
    expect(JSON.stringify(ev)).not.toContain("Forgot");
  });

  it("correction_updates_existing", async () => {
    const list = await as(s.employee, "GET",
      "/v1/attendance?from=2026-03-02&to=2026-03-02");
    const rec = list.body.items[0];
    const r = await as(s.employee, "POST", C, { ...day("2026-03-02",
      "04:00", "13:00"), attendanceId: rec.id });
    expect(r.status, r.text).toBe(201);
    await as(s.hr, "POST", `${C}/${r.body.id}/approve`);
    const after = await as(s.employee, "GET",
      "/v1/attendance?from=2026-03-02&to=2026-03-02");
    expect(after.body.items).toHaveLength(1);
    expect(after.body.items[0]).toMatchObject({ id: rec.id, minutes: 540,
      clockIn: "2026-03-02T04:00:00.000Z" });
  });

  it("correction_rules", async () => {
    const other = await as(s.employee, "POST", C, { ...day("2026-03-03",
      "05:00", "13:00"), date: "2026-03-05" });
    expect(other.status).toBe(422);
    expect(other.body.error.code).toBe("CORRECTION_TIMES_INVALID");
    const long = await as(s.employee, "POST", C, { date: "2026-03-03",
      clockIn: "2026-03-03T01:00:00.000Z",
      clockOut: "2026-03-04T02:00:00.000Z", reason: "too long" });
    expect(long.body.error.code).toBe("CORRECTION_TIMES_INVALID");
    const overlap = await as(s.employee, "POST", C, day("2026-03-02",
      "12:00", "14:00"));
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe("ATTENDANCE_OVERLAP");
    const colleague = await as(s.employee, "POST", C, { ...day(
      "2026-03-03", "05:00", "13:00"), employeeId: s.emp.manager });
    expect(colleague.status).toBe(403);
  });

  it("correction_sod_and_scope", async () => {
    const own = await as(s.manager, "POST", C, day("2026-03-06", "05:00",
      "13:00"));
    expect(own.status, own.text).toBe(201);
    const self = await as(s.manager, "POST", `${C}/${own.body.id}/approve`);
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe("SOD_VIOLATION");
    await ctx.deps.db.query("UPDATE memberships SET employee_id = $1 " +
      "WHERE user_id = $2", [s.emp.outsider, s.employee.userId]);
    const out = await as(s.employee, "POST", C, day("2026-03-06", "05:00",
      "13:00"));
    await ctx.deps.db.query("UPDATE memberships SET employee_id = $1 " +
      "WHERE user_id = $2", [s.emp.report, s.employee.userId]);
    const scope = await as(s.manager, "POST", `${C}/${out.body.id}/approve`);
    expect(scope.status).toBe(404);
    const once = await as(s.hr, "POST", `${C}/${out.body.id}/approve`);
    expect(once.status, once.text).toBe(200);
    const twice = await as(s.hr, "POST", `${C}/${out.body.id}/approve`);
    expect(twice.status).toBe(409);
    expect(twice.body.error.code).toBe("CORRECTION_NOT_PENDING");
    const rej = await as(s.hr, "POST", `${C}/${own.body.id}/reject`,
      { note: "no" });
    expect(rej.body.status).toBe("rejected");
  });
});
