import { beforeEach, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, linkUser, seedTime } from "./helpers/seed-time";
import {
  minutes,
  nextMinute,
  seedWfh,
  WFH_SENTINEL,
} from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const ACT = "/v1/wfh/activity";
const LOC = "/v1/wfh/location";
const iso = (d: Date, plusMin: number) =>
  new Date(d.getTime() + plusMin * 60_000).toISOString();

describe("wfh uploads", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let rec: string;
  let first: Date;
  const rows = async () => (await ctx.deps.db.query(
    "SELECT 1 FROM wfh_activity_minutes")).length +
    (await ctx.deps.db.query("SELECT 1 FROM wfh_location_samples")).length;
  const loc = (at: string, extra: Record<string, unknown> = {}) =>
    as(s.employee, "POST", LOC, { attendanceId: rec, at, ...WFH_SENTINEL,
      accuracyM: 10, source: "phone", indicatorShown: true, ...extra });
  beforeEach(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wing");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    ({ attendanceId: rec, first } = await seedWfh(ctx, s));
  });

  it("wfh_activity_accepted_and_idempotent", async () => {
    const r = await as(s.employee, "POST", ACT, { attendanceId: rec,
      minutes: minutes(first, 10) });
    expect(r.body).toEqual({ accepted: 0, duplicates: 10 });
    const more = await as(s.employee, "POST", ACT, { attendanceId: rec,
      minutes: minutes(new Date(first.getTime() + 600_000), 2) });
    expect(more.body).toEqual({ accepted: 2, duplicates: 0 });
  });

  it("wfh_upload_rejections_store_nothing", async () => {
    const reject = async (body: unknown, status: number, code: string) => {
      const before = await rows();
      const r = await as(s.employee, "POST", ACT, body);
      expect(r.status, `${code} ${r.text}`).toBe(status);
      expect(r.body.error.code).toBe(code);
      expect(await rows()).toBe(before);
    };
    const one = (o: Record<string, unknown> = {}, top = {}) => ({
      attendanceId: rec, minutes: [{ at: iso(first, 12), active: true,
        category: null, ...o }], ...top });
    for (const k of ["url", "title", "windowTitle", "screenshot",
      "keystrokes"]) {
      await reject(one({ [k]: "x" }), 400, "VALIDATION_FAILED");
      await reject(one({}, { [k]: "x" }), 400, "VALIDATION_FAILED");
    }
    await reject({ attendanceId: rec, minutes: [{ at:
      new Date(first.getTime() + 61_000).toISOString(), active: true,
      category: null }] }, 400, "VALIDATION_FAILED");
    await as(s.employee, "POST", "/v1/wfh/me/pause");
    const pausedAt = iso(ctx.clock.now, 0).replace(/:\d\d\.\d+Z$/,
      ":00.000Z");
    ctx.clock.advance(5 * 60_000);
    await as(s.employee, "POST", "/v1/wfh/me/resume");
    await reject({ attendanceId: rec, minutes: [{ at: iso(new Date(
      pausedAt), 1), active: true, category: null }] }, 422,
    "TRACKING_PAUSED");
    ctx.clock.advance(60_000);
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    ctx.clock.advance(60 * 60_000);
    await reject(one({ at: iso(ctx.clock.now, -30).replace(/:\d\d\.\d+Z$/,
      ":00.000Z") }), 422, "SAMPLE_OUTSIDE_CLOCKED_TIME");
    const site = await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web" });
    await reject({ attendanceId: site.body.id, minutes: [{ at: iso(
      ctx.clock.now, 1).replace(/:\d\d\.\d+Z$/, ":00.000Z"), active: true,
      category: null }] }, 422, "NOT_REMOTE_RECORD");
    await as(s.employee, "POST", "/v1/wfh/consent/withdraw",
      { erase: false });
    await reject(one({ at: iso(first, 11) }), 422, "CONSENT_REQUIRED");
  });

  it("colleague_record_refused", async () => {
    // The colleague is tracked and has consented: only the record
    // check stops them.
    const peer = await linkUser(ctx, s, s.emp.report2, "wingpeer");
    await as(s.hr, "PUT", `/v1/employees/${s.emp.report2}/time-profile`, {
      workMode: "hybrid", geofenceMode: "off", workSiteIds: [],
      wfhTracked: true, shiftWorker: false });
    await as(peer, "POST", "/v1/wfh/consent", { noticeVersion: 1,
      decision: "granted" });
    const before = await rows();
    const r = await as(peer, "POST", ACT, { attendanceId: rec,
      minutes: minutes(new Date(first.getTime() + 600_000), 1) });
    expect(r.status, r.text).toBe(422);
    expect(r.body.error.code).toBe("NOT_REMOTE_RECORD");
    expect(await rows()).toBe(before);
  });

  it("wfh_forgotten_clock_out_stops_at_bound", async () => {
    await as(s.owner, "PUT", "/v1/wfh/settings",
      { maxTrackedMinutesPerRecord: 120 });
    const inAt = Date.parse((await ctx.deps.db.query<{ clock_in: string }>(
      "SELECT clock_in FROM attendance WHERE id = $1", [rec]))[0]!.clock_in);
    ctx.clock.now = new Date(inAt + 5 * 3600_000);
    const at = new Date(Math.ceil((inAt + 121 * 60_000) / 60_000) * 60_000);
    const a = await as(s.employee, "POST", ACT, { attendanceId: rec,
      minutes: minutes(at, 1) });
    expect(a.body.error.code).toBe("SAMPLE_OUTSIDE_CLOCKED_TIME");
    const l = await loc(at.toISOString());
    expect(l.body.error.code).toBe("SAMPLE_OUTSIDE_CLOCKED_TIME");
    const st = await as(s.employee, "GET", "/v1/wfh/me/status");
    expect(st.body.state).toBe("stopped-limit");
  });

  it("location_hourly_gap", async () => {
    ctx.clock.now = new Date(first.getTime() + 125 * 60_000);
    const r1 = await loc(iso(first, 59));
    expect(r1.status).toBe(409);
    expect(r1.body.error.code).toBe("LOCATION_TOO_FREQUENT");
    expect((await loc(iso(first, 60))).status).toBe(201);
    expect((await loc(iso(first, 30))).status).toBe(409);
    expect((await loc(iso(first, 120))).status).toBe(201);
  });

  it("location_concurrent_once", async () => {
    ctx.clock.now = new Date(first.getTime() + 125 * 60_000);
    const [a, b] = await Promise.all([loc(iso(first, 120)),
      loc(iso(first, 121))]);
    expect([a!.status, b!.status].sort()).toEqual([201, 409]);
    const n = await ctx.deps.db.query(
      "SELECT 1 FROM wfh_location_samples WHERE at > $1",
      [iso(first, 100)]);
    expect(n.length).toBe(1);
  });

  it("location_rounded_and_minimal", async () => {
    const [r] = await ctx.deps.db.query<{ lat_e3: number }>(
      "SELECT * FROM wfh_location_samples");
    expect(r!.lat_e3).toBe(1234);
    expect(Object.keys(r!).join(" ")).not.toMatch(/accuracy|indicator/);
  });

  it("location_needs_indicator", async () => {
    ctx.clock.now = new Date(first.getTime() + 125 * 60_000);
    expect((await loc(iso(first, 120), { indicatorShown: false })).status)
      .toBe(400);
    const { indicatorShown: _i, ...without } = { indicatorShown: true };
    expect(_i).toBe(true);
    const r = await as(s.employee, "POST", LOC, { attendanceId: rec,
      at: iso(first, 120), ...WFH_SENTINEL, accuracyM: 10,
      source: "phone", ...without });
    expect(r.status).toBe(400);
  });

  it("category_not_collected", async () => {
    await as(s.owner, "PUT", "/v1/wfh/settings",
      { activityCategories: false });
    await as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion: 2,
      decision: "granted" });
    // Minutes before the new consent are outside; use one after it.
    const at = nextMinute(ctx.clock.now);
    ctx.clock.advance(3 * 60_000);
    const r = await as(s.employee, "POST", ACT, { attendanceId: rec,
      minutes: minutes(at, 1) });
    expect(r.body.error.code).toBe("CATEGORY_NOT_COLLECTED");
    const ok = await as(s.employee, "POST", ACT, { attendanceId: rec,
      minutes: [{ at: at.toISOString(), active: false, category: null }] });
    expect(ok.status, ok.text).toBe(200);
  });

  it("uploads_not_audited", async () => {
    const n = async () => (await ctx.deps.db.query(
      "SELECT 1 FROM audit_events")).length;
    const before = await n();
    await as(s.employee, "POST", ACT, { attendanceId: rec,
      minutes: minutes(new Date(first.getTime() + 600_000), 3) });
    ctx.clock.now = new Date(first.getTime() + 125 * 60_000);
    await loc(iso(first, 120));
    expect(await n()).toBe(before);
  });
});
