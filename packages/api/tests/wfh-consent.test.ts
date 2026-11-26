import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime } from "./helpers/seed-time";
import { enableWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("wfh consent", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  const state = async () => (await as(s.employee, "GET",
    "/v1/wfh/me/status")).body.state;
  const consent = (noticeVersion: number, decision: string) =>
    as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion, decision });
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wcon");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
  });

  it("consent_states", async () => {
    expect(await state()).toBe("off");
    await enableWfh(ctx, s);
    expect(await state()).toBe("needs-consent");
    const g = await consent(1, "granted");
    expect(g.status, g.text).toBe(200);
    expect(await state()).toBe("ready");
    await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web" });
    expect(await state()).toBe("ready");
    ctx.clock.advance(60_000);
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web", workLocation: "remote" });
    expect(await state()).toBe("tracking");
    await consent(1, "declined");
    expect(await state()).toBe("declined");
    await consent(1, "granted");
    await as(s.hr, "POST", "/v1/wfh/notices", {});
    expect(await state()).toBe("needs-consent");
  });

  it("consent_stale_version", async () => {
    const r = await consent(1, "granted");
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("NOTICE_VERSION_STALE");
  });

  it("consent_only_self", async () => {
    const r = await as(s.employee, "POST", "/v1/wfh/consent", {
      noticeVersion: 2, decision: "granted", employeeId: s.emp.manager });
    expect(r.status).toBe(400);
    const o = await as(s.owner, "POST", "/v1/wfh/consent", {
      noticeVersion: 2, decision: "granted" });
    expect(o.status).toBe(422);
    expect(o.body.error.code).toBe("NO_EMPLOYEE_LINK");
  });

  it("consent_audit_has_no_text", async () => {
    await consent(2, "granted");
    const rows = await ctx.deps.db.query<{ data: unknown }>(
      "SELECT data FROM audit_events WHERE action = 'wfh.consent.granted'");
    expect(rows.length).toBeGreaterThan(0);
    const text = JSON.stringify(rows);
    expect(text).not.toContain("tracking notice");
    expect(text).not.toMatch(/category|documents|meetings/);
  });
});
