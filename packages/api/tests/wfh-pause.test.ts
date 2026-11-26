import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime } from "./helpers/seed-time";
import { enableWfh } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const ME = "/v1/wfh/me";

describe("wfh pause", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  const status = async () => (await as(s.employee, "GET",
    `${ME}/status`)).body;
  const auditCount = async () => (await ctx.deps.db.query(
    "SELECT 1 FROM audit_events")).length;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wpau");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    await enableWfh(ctx, s);
  });

  it("pause_needs_tracking", async () => {
    const r = await as(s.employee, "POST", `${ME}/pause`);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("CONSENT_REQUIRED");
  });

  it("pause_and_resume", async () => {
    await as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion: 1,
      decision: "granted" });
    await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web", workLocation: "remote" });
    const before = await auditCount();
    const p = await as(s.employee, "POST", `${ME}/pause`);
    expect(p.status, p.text).toBe(200);
    expect(p.body.state).toBe("paused");
    const p2 = await as(s.employee, "POST", `${ME}/pause`);
    expect(p2.status).toBe(409);
    expect(p2.body.error.code).toBe("ALREADY_PAUSED");
    ctx.clock.advance(60_000);
    const r = await as(s.employee, "POST", `${ME}/resume`);
    expect(r.body.state).toBe("tracking");
    const r2 = await as(s.employee, "POST", `${ME}/resume`);
    expect(r2.status).toBe(409);
    expect(r2.body.error.code).toBe("NOT_PAUSED");
    // pause_not_audited
    expect(await auditCount()).toBe(before);
  });

  it("clock_out_closes_pause", async () => {
    await as(s.employee, "POST", `${ME}/pause`);
    ctx.clock.advance(60_000);
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    const open = await ctx.deps.db.query(
      "SELECT 1 FROM wfh_pauses WHERE ended_at IS NULL");
    expect(open).toEqual([]);
    expect((await status()).state).toBe("ready");
  });

  it("hr_correction_closes_an_open_pause", async () => {
    const rec = await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web", workLocation: "remote" });
    await as(s.employee, "POST", `${ME}/pause`);
    ctx.clock.advance(2 * 60_000);
    const out = new Date(ctx.clock.now.getTime() - 60_000).toISOString();
    const put = await as(s.hr, "PUT", `/v1/attendance/${rec.body.id}`, {
      clockIn: rec.body.clockIn, clockOut: out, note: "closed by hr" });
    expect(put.status, put.text).toBe(200);
    const open = await ctx.deps.db.query(
      "SELECT 1 FROM wfh_pauses WHERE ended_at IS NULL");
    expect(open).toEqual([]);
  });

  it("withdraw_with_erase_removes_an_open_pause", async () => {
    await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web", workLocation: "remote" });
    expect((await as(s.employee, "POST", `${ME}/pause`)).status).toBe(200);
    const w = await as(s.employee, "POST", "/v1/wfh/consent/withdraw",
      { erase: true });
    expect(w.status, w.text).toBe(200);
    expect(await ctx.deps.db.query("SELECT 1 FROM wfh_pauses")).toEqual([]);
    await as(s.employee, "POST", "/v1/attendance/clock-out");
    await as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion: 1,
      decision: "granted" });
  });

  it("stopped_limit_state", async () => {
    await as(s.owner, "PUT", "/v1/wfh/settings",
      { maxTrackedMinutesPerRecord: 60 });
    await as(s.employee, "POST", "/v1/attendance/clock-in",
      { method: "web", workLocation: "remote" });
    ctx.clock.advance(61 * 60_000);
    const st = await status();
    expect(st.state).toBe("stopped-limit");
    const p = await as(s.employee, "POST", `${ME}/pause`);
    expect(p.body.error.code).toBe("TRACKING_LIMIT_REACHED");
  });
});
