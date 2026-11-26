import { beforeAll, describe, expect, it } from "vitest";
import { timeAudit } from "../src/audit/time-audit";
import { withTenant } from "../src/db/tenant";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("time settings, calendar, sites, profiles", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "tset");
    await keepSessions(ctx);
    as = asUser(ctx, s);
  });

  it("settings_defaults_labelled", async () => {
    const r = await as(s.employee, "GET", "/v1/time/settings");
    expect(r.status, r.text).toBe(200);
    expect(r.body.restDays).toEqual([]);
    expect([...r.body.productDefaults].sort()).toEqual([
      "accuracyAllowanceM", "graceMinutes", "lateFlagThreshold",
      "restAdjacentAbsenceThreshold", "shortSickSpellThreshold"]);
    const p = await as(s.hr, "PUT", "/v1/time/settings",
      { graceMinutes: 10 });
    expect(p.status, p.text).toBe(200);
    expect(p.body.graceMinutes).toBe(10);
    expect(p.body.productDefaults).not.toContain("graceMinutes");
    const e = await as(s.employee, "PUT", "/v1/time/settings",
      { graceMinutes: 1 });
    expect(e.status).toBe(403);
    expect(e.body.error.code).toBe("FORBIDDEN");
  });

  it("settings_reject_unknown_keys", async () => {
    const r = await as(s.hr, "PUT", "/v1/time/settings",
      { screenshots: true });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_FAILED");
    const dup = await as(s.hr, "PUT", "/v1/time/settings",
      { restDays: ["fri", "fri"] });
    expect(dup.status).toBe(400);
  });

  it("holiday_one_per_date", async () => {
    const body = { date: "2026-03-20", name: "Company Day A",
      kind: "company" };
    const a = await as(s.hr, "POST", "/v1/time/holidays", body);
    expect(a.status, a.text).toBe(201);
    const b = await as(s.hr, "POST", "/v1/time/holidays", body);
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe("HOLIDAY_EXISTS");
    const rm = await as(s.hr, "PATCH", `/v1/time/holidays/${a.body.id}`,
      { status: "removed" });
    expect(rm.body.status).toBe("removed");
    const c = await as(s.hr, "POST", "/v1/time/holidays",
      { ...body, name: "Company Day B" });
    expect(c.status, c.text).toBe(201);
    const list = await as(s.employee, "GET", "/v1/time/holidays?year=2026");
    expect(list.body.items.map((h: { status: string }) => h.status).sort())
      .toEqual(["active", "removed"]);
    const kind = await as(s.hr, "PATCH", `/v1/time/holidays/${c.body.id}`,
      { date: "2026-03-21" });
    expect(kind.status).toBe(400);
  });

  it("no_builtin_calendar", async () => {
    const fresh = await seedCompany(ctx, "tsetfresh");
    await keepSessions(ctx);
    const f = asUser(ctx, fresh);
    for (let y = 2024; y <= 2030; y++) {
      const h = await f(fresh.owner, "GET", `/v1/time/holidays?year=${y}`);
      expect(h.body.items, String(y)).toEqual([]);
      const p = await f(fresh.owner, "GET",
        `/v1/time/special-periods?year=${y}`);
      expect(p.body.items, String(y)).toEqual([]);
    }
  });

  it("special_period_overlap", async () => {
    const base = { kind: "ramadan", name: "Test period" };
    const a = await as(s.hr, "POST", "/v1/time/special-periods",
      { ...base, start: "2026-02-18", end: "2026-03-19" });
    expect(a.status, a.text).toBe(201);
    const b = await as(s.hr, "POST", "/v1/time/special-periods",
      { ...base, start: "2026-03-19", end: "2026-03-25" });
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe("PERIOD_OVERLAP");
    const long = await as(s.hr, "POST", "/v1/time/special-periods",
      { ...base, start: "2027-01-01", end: "2027-02-10" });
    expect(long.status).toBe(400);
    const list = await as(s.employee, "GET",
      "/v1/time/special-periods?year=2026");
    expect(list.body.items.length).toBe(1);
  });

  it("profile_geofence_needs_site", async () => {
    const path = `/v1/employees/${s.emp.report}/time-profile`;
    const prof = { workMode: "site", geofenceMode: "require",
      workSiteIds: [], wfhTracked: false, shiftWorker: false };
    const none = await as(s.hr, "PUT", path, prof);
    expect(none.status).toBe(422);
    expect(none.body.error.code).toBe("WORK_SITE_REQUIRED");
    const site = await as(s.hr, "POST", "/v1/time/work-sites",
      { name: "Site A", point: { lat: 1.5, lng: 1.5 }, radiusM: 200 });
    const ok = await as(s.hr, "PUT", path,
      { ...prof, workSiteIds: [site.body.id] });
    expect(ok.status, ok.text).toBe(200);
    const mine = await as(s.employee, "GET", path);
    expect(mine.body.geofenceMode).toBe("require");
    const other = await as(s.manager, "GET",
      `/v1/employees/${s.emp.outsider}/time-profile`);
    expect(other.status).toBe(404);
    const dflt = await as(s.hr, "GET",
      `/v1/employees/${s.emp.outsider}/time-profile`);
    expect(dflt.body).toMatchObject({ workMode: "site",
      geofenceMode: "off", wfhTracked: false });
    const unknown = await as(s.hr, "PUT", path, { ...prof,
      workSiteIds: ["00000000-0000-4000-8000-00000000dead"] });
    expect(unknown.status).toBe(422);
  });

  it("time_audit_rejects_coordinates", async () => {
    await expect(withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => timeAudit(tx, { companyId: s.companyId,
      at: "2026-03-01T08:00:00.000Z", actorUserId: null,
      action: "site.created", entityType: "work-site", entityId: null,
      data: { lat: "1" } }))).rejects.toMatchObject({
      code: "AUDIT_SENSITIVE_DATA" });
    await as(s.hr, "POST", "/v1/time/work-sites",
      { name: "Site Z", point: { lat: 1.23456, lng: 1.65432 },
        radiusM: 100 });
    const rows = await ctx.deps.db.query<{ data: unknown }>(
      "SELECT data FROM audit_events WHERE action = 'site.created'");
    expect(rows.length).toBeGreaterThan(0);
    const text = JSON.stringify(rows);
    expect(text).not.toContain("1.23456");
    expect(text).not.toContain("1.65432");
  });
});
