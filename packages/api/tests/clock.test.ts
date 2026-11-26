import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime, type TimeSeed } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const deg = (m: number) => m / 6371008.8 * 180 / Math.PI;
const IN = "/v1/attendance/clock-in";
const OUT = "/v1/attendance/clock-out";

describe("geofenced clock-in", () => {
  let ctx: Ctx;
  let s: Seeded;
  let t: TimeSeed;
  let as: ReturnType<typeof asUser>;
  const profile = (geofenceMode: string, workMode = "site") =>
    as(s.hr, "PUT", `/v1/employees/${s.emp.report}/time-profile`, {
      workMode, geofenceMode, workSiteIds: [t.siteId], wfhTracked: false,
      shiftWorker: false });
  const inOut = async (body?: unknown) => {
    const r = await as(s.employee, "POST", IN, body);
    ctx.clock.advance(60_000);
    await as(s.employee, "POST", OUT);
    ctx.clock.advance(60_000);
    return r;
  };
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "clk");
    t = await seedTime(ctx, s);
    as = asUser(ctx, s);
  });
  beforeEach(() => ctx.clock.advance(3_600_000));

  it("clock_in_phone_inside_geofence", async () => {
    await profile("require");
    const r = await inOut({ method: "phone", location: { lat: 1.5 +
      deg(50), lng: 1.5, accuracyM: 10 }, locationDecision: "shared" });
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ method: "phone", workLocation: "site",
      exception: null, geofence: { mode: "require", result: "inside",
        siteId: t.siteId, distanceM: 50 } });
  });

  it("clock_in_outside_require_creates_exception", async () => {
    await profile("require");
    const far = await inOut({ method: "web", location: { lat: 1.5 +
      deg(2000), lng: 1.5, accuracyM: 10 } });
    expect(far.status, far.text).toBe(201);
    expect(far.body.exception).toBe("outside-geofence");
    const declined = await inOut({ method: "web",
      locationDecision: "declined" });
    expect(declined.status).toBe(201);
    expect(declined.body.exception).toBe("no-location");
    expect(declined.body.geofence.result).toBe("no-location");
  });

  it("clock_coordinates_never_stored", async () => {
    await profile("record");
    const r = await inOut({ method: "phone", location: { lat: 1.23456,
      lng: 1.65432, accuracyM: 5 } });
    expect(r.status, r.text).toBe(201);
    const rows = await ctx.deps.db.query("SELECT * FROM attendance");
    const audit = await ctx.deps.db.query("SELECT * FROM audit_events");
    const text = JSON.stringify([rows, audit, ctx.logs], (_, v) =>
      typeof v === "bigint" ? String(v) : v);
    expect(text).not.toContain("1.2345");
    expect(text).not.toContain("1.6543");
    const cols = await ctx.deps.db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'attendance'`);
    for (const c of cols) expect(c.column_name).not.toMatch(/lat|lng/);
  });

  it("geofence_off_ignores_location", async () => {
    await profile("off");
    const r = await inOut({ method: "web", location: { lat: 1.5, lng: 1.5,
      accuracyM: 5 } });
    expect(r.body.geofence).toEqual({ mode: "off", result: "not-applied",
      siteId: null, distanceM: null });
  });

  it("remote_needs_profile", async () => {
    await profile("require", "site");
    const no = await as(s.employee, "POST", IN, { method: "web",
      workLocation: "remote" });
    expect(no.status).toBe(422);
    expect(no.body.error.code).toBe("REMOTE_NOT_ALLOWED");
    await profile("require", "hybrid");
    const ok = await inOut({ method: "web", workLocation: "remote" });
    expect(ok.status, ok.text).toBe(201);
    expect(ok.body.geofence.result).toBe("not-applied");
    expect(ok.body.workLocation).toBe("remote");
  });

  it("clock_in_without_body_still_works", async () => {
    const r = await inOut();
    expect(r.status, r.text).toBe(201);
    expect(r.body.method).toBe("unknown");
    const extra = await as(s.employee, "POST", IN, { method: "web",
      screenshot: true });
    expect(extra.status).toBe(400);
  });

  it("clock_out_24_hour_bound_exact", async () => {
    ctx.clock.now = new Date("2026-03-05T05:00:00.000Z");
    expect((await as(s.employee, "POST", IN)).status).toBe(201);
    ctx.clock.now = new Date("2026-03-06T05:01:00.000Z");
    const late = await as(s.employee, "POST", OUT);
    expect(late.status).toBe(422);
    expect(late.body.error.code).toBe("CLOCK_OUT_TOO_LATE");
    ctx.clock.now = new Date("2026-03-06T05:00:00.000Z");
    const edge = await as(s.employee, "POST", OUT);
    expect(edge.status, edge.text).toBe(200);
    expect(edge.body.minutes).toBe(1440);
  });

  it("clock_in_after_2000_utc_dated_next_dubai_day", async () => {
    ctx.clock.now = new Date("2026-03-01T20:30:00.000Z");
    const i = await as(s.employee, "POST", IN, { method: "web" });
    expect(i.status, i.text).toBe(201);
    expect(i.body.date).toBe("2026-03-02");
    ctx.clock.now = new Date("2026-03-02T00:30:00.000Z");
    const o = await as(s.employee, "POST", OUT, { method: "web" });
    expect(o.status, o.text).toBe(200);
    expect(o.body.date).toBe("2026-03-02");
    expect(o.body.minutes).toBe(240);
  });
});
