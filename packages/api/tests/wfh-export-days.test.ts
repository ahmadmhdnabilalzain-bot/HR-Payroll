import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions, seedTime } from "./helpers/seed-time";
import { minutes, nextMinute, seedWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const DAY = 86_400_000;

describe("WFH export over several days and at the cutoff (review N8)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let first: Date;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "rri4");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    first = (await seedWfh(ctx, s)).first;
    // Clock out, then a second remote record 10 days later.
    ctx.clock.now = new Date(first.getTime() + 20 * 60_000);
    expect((await as(s.employee, "POST", "/v1/attendance/clock-out"))
      .status).toBe(200);
    ctx.clock.now = new Date(first.getTime() + 10 * DAY);
    await keepSessions(ctx);
    const rec = (await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web", workLocation: "remote" })).body;
    const f2 = nextMinute(new Date(Date.parse(rec.clockIn)));
    ctx.clock.now = new Date(f2.getTime() + 30 * 60_000);
    const up = await as(s.employee, "POST", "/v1/wfh/activity", {
      attendanceId: rec.id, minutes: minutes(f2, 25) });
    expect(up.status, up.text).toBe(200);
  });

  const stored = async () => (await ctx.deps.db.query(
    "SELECT at FROM wfh_activity_minutes WHERE employee_id = $1",
    [s.emp.report])).length;

  it("two days 10 days apart: every stored minute exported", async () => {
    const x = await as(s.employee, "GET", "/v1/wfh/me/export");
    expect(x.status, x.text).toBe(200);
    expect(x.body.minutes.length).toBe(await stored());
    expect(x.body.minutes.length).toBe(35);
    const keys = new Set<string>();
    const walk = (o: unknown) => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o !== null && typeof o === "object") {
        for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); }
      }
    };
    walk(x.body);
    expect([...keys].some((k) => /url|title|screen|host|key|window|image/i
      .test(k))).toBe(false);
  });

  it("first minute exactly at the cutoff: kept and exported", async () => {
    ctx.clock.now = new Date(first.getTime() + 30 * DAY);
    await keepSessions(ctx);
    const x = await as(s.employee, "GET", "/v1/wfh/me/export");
    expect(x.status, x.text).toBe(200);
    const n = await stored();
    expect(x.body.minutes.length).toBe(n);
    expect(x.body.minutes[0].at).toBe(first.toISOString());
    ctx.clock.now = new Date(first.getTime() + 30 * DAY + 60_000);
    const y = await as(s.employee, "GET", "/v1/wfh/me/export");
    expect(y.body.minutes.length).toBe(await stored());
  });
});
