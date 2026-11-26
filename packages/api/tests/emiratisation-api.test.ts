import { FINE_2026_NOTE } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, SENTINELS, type Seeded } from "./helpers/seed";
import { seedHeadcount } from "./helpers/seed-headcount";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("Emiratisation report (Review Focus: honest figures)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let heads: string[];
  const report = (q = "") => call(ctx.app, s.hr.token, s.companyId, "GET",
    `/v1/emiratisation${q}`);
  const settings = (body: object, token = s.owner.token) =>
    call(ctx.app, token, s.companyId, "PUT", "/v1/emiratisation/settings",
      body);
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-12-01T08:00:00.000Z" });
    s = await seedCompany(ctx, "emir");
  });

  it("a company under 20 is not applicable", async () => {
    const r = await report();
    expect(r.status, r.text).toBe(200);
    expect(r.body).toMatchObject({ band: "none",
      status: "not-applicable", asOf: "2026-12-01" });
  });

  it("on target with the owner's rounding", async () => {
    heads = await seedHeadcount(ctx, s, 55, { nationals: 4, skilled: 40 });
    const put = await settings({ sectorInScope: null,
      overrides: { largeRequiredRounding: "DOWN" } });
    expect(put.status, put.text).toBe(200);
    const r = await report();
    expect(r.body).toMatchObject({ band: "large", status: "on-target",
      headcount: 59, skilledHeadcount: 40, required: 4,
      countedNationals: 4, checkpoint: "2026-12-31" });
    for (const t of Object.values(SENTINELS)) {
      expect(r.text).not.toContain(t.salary);
    }
    const [a] = await ctx.deps.db.query<{ data: unknown }>(
      `SELECT data FROM audit_events WHERE company_id = $1 AND
        action = 'emiratisation.settings.updated'`, [s.companyId]);
    expect(a!.data).toEqual({ settingsChanged:
      ["overrides.largeRequiredRounding"] });
  });

  it("the unsourced 2026 fine never fails the report", async () => {
    const f = await call(ctx.app, s.hr.token, s.companyId, "PUT",
      `/v1/employees/${heads[0]}/emiratisation`, { skilled: true,
        workPermitValid: true, paidViaWps: false, gpssaRegistered: true });
    expect(f.status, f.text).toBe(200);
    const r = await report();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "below-target", shortfall: 1,
      countedNationals: 3, fineExposure: null, fineNote: FINE_2026_NOTE });
    expect(r.body.notCounted).toContainEqual({ employeeId: heads[0],
      reasons: ["not-paid-via-wps"] });
    expect(r.body.disclaimer).toMatch(/Not legal advice/);
  });

  it("an owner-entered fine gives an estimate", async () => {
    await settings({ sectorInScope: null, overrides: {
      largeRequiredRounding: "DOWN", finePerPostPerYear_2026: 12000000 } });
    expect((await report()).body.fineExposure).toBe("120000.00");
  });

  it("only listed keys, only the owner, never the manager", async () => {
    const bad = await settings({ sectorInScope: null,
      overrides: { minWageFils: 1 } });
    expect([bad.status, bad.body.error.code])
      .toEqual([422, "OVERRIDE_NOT_ALLOWED"]);
    const shape = await settings({ sectorInScope: null,
      overrides: { largeRequiredRounding: "HALF_EVEN" } });
    expect(shape.status).toBe(400);
    expect((await settings({ sectorInScope: null, overrides: {} },
      s.hr.token)).status).toBe(403);
    expect((await call(ctx.app, s.manager.token, s.companyId, "GET",
      "/v1/emiratisation")).status).toBe(403);
  });

  it("a date outside the pack is refused by the engine", async () => {
    const r = await report("?asOf=2024-06-01");
    expect([r.status, r.body.error.code, r.body.error.detail.engineCode])
      .toEqual([422, "ENGINE_REFUSED", "NO_PACK_FOR_DATE"]);
  });
});
