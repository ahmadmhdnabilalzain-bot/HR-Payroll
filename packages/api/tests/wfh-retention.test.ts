import { beforeEach, describe, expect, it } from "vitest";
import { purgeAllCompanies } from "../src/db/wfh-purge-all";
import { withTenant } from "../src/db/tenant";
import { dubaiDate } from "../src/time/dubai";
import { wfhDayTotals } from "../src/wfh/views";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, keepSessions, seedTime } from "./helpers/seed-time";
import { seedWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("wfh retention and erasure", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  let first: Date;
  const count = async (t: string) =>
    (await ctx.deps.db.query(`SELECT 1 FROM ${t}`)).length;
  beforeEach(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wret");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    ({ first } = await seedWfh(ctx, s));
    await as(s.employee, "POST", "/v1/attendance/clock-out");
  });

  it("reads_hide_expired", async () => {
    const day = dubaiDate(first);
    const later = new Date(first.getTime() + 31 * 86_400_000);
    const fresh = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => wfhDayTotals(tx, s.companyId, s.emp.report,
      day, day, first));
    expect(fresh.get(day)?.activeMinutes).toBe(10);
    const old = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => wfhDayTotals(tx, s.companyId, s.emp.report,
      day, day, later));
    expect(old.size).toBe(0);
    ctx.clock.now = later;
    await keepSessions(ctx);
    const r = await as(s.employee, "GET",
      `/v1/wfh/me/days?from=${day}&to=${day}`);
    expect(r.body.items).toEqual([]);
  });

  it("purge_deletes_and_audits_counts", async () => {
    ctx.clock.now = new Date(first.getTime() + 31 * 86_400_000);
    await keepSessions(ctx);
    await as(s.employee, "GET", "/v1/wfh/me/status");
    expect(await count("wfh_activity_minutes")).toBe(0);
    expect(await count("wfh_location_samples")).toBe(0);
    const ev = await ctx.deps.db.query<{ data: Record<string, unknown> }>(
      "SELECT data FROM audit_events WHERE action = 'wfh.purged'");
    expect(ev.length).toBe(1);
    expect(Object.keys(ev[0]!.data).sort()).toEqual(["activity",
      "locations", "pauses"]);
    await as(s.employee, "GET", "/v1/wfh/me/status");
    expect((await ctx.deps.db.query(
      "SELECT 1 FROM audit_events WHERE action = 'wfh.purged'")).length)
      .toBe(1);
  });

  it("withdraw_with_erase", async () => {
    const keep = await as(s.employee, "POST", "/v1/wfh/consent/withdraw",
      { erase: false });
    expect(keep.body.erasedRows).toBe(0);
    expect(await count("wfh_activity_minutes")).toBe(10);
    await as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion: 1,
      decision: "granted" });
    const r = await as(s.employee, "POST", "/v1/wfh/consent/withdraw",
      { erase: true });
    expect(r.status, r.text).toBe(200);
    expect(r.body.erasedRows).toBe(11);
    expect(await count("wfh_activity_minutes")).toBe(0);
    expect(await count("wfh_location_samples")).toBe(0);
  });

  it("purge_command", async () => {
    const other = await seedCompany(ctx, "wret2");
    await seedTime(ctx, other);
    await seedWfh(ctx, other);
    // The second company keeps its data for 60 days, not 30.
    await asUser(ctx, other)(other.owner, "PUT", "/v1/wfh/settings",
      { retentionDays: 60 });
    expect(await count("wfh_activity_minutes")).toBe(20);
    ctx.clock.now = new Date(first.getTime() + 31 * 86_400_000);
    const n = await purgeAllCompanies(ctx.deps.db, ctx.deps.db, ctx.deps);
    expect(n).toBe(2);
    const left = await ctx.deps.db.query<{ company_id: string }>(
      "SELECT company_id FROM wfh_activity_minutes");
    expect(left.length).toBe(10);
    for (const r of left) expect(r.company_id).toBe(other.companyId);
  });
});
