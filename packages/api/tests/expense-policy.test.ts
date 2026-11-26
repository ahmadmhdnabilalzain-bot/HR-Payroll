import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("expense categories and policy", () => {
  let ctx: Ctx;
  let s: Seeded;
  let fuel: string;
  const as = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const policy = (over: Record<string, unknown> = {}) => ({
    claimWindowDays: 90, expectedVersion: 0,
    limits: [{ categoryId: fuel, role: null, perItemMax: "300.00",
      monthlyMax: "1000.00", receiptRequiredAbove: "50.00",
      overLimit: "flag" }],
    mileageRates: [{ code: "car", label: "Own car", perKm: "0.75",
      effectiveFrom: "2026-01-01" }],
    perDiemRates: [], ...over });
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "pol");
  });

  it("hr creates a category; a duplicate code is 409", async () => {
    const body = { code: "fuel", name: "Fuel", kind: "receipt" };
    const r = await as(s.hr, "POST", "/v1/expense-categories", body);
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ code: "fuel", active: true,
      nameAr: null });
    fuel = r.body.id;
    const dup = await as(s.owner, "POST", "/v1/expense-categories", body);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("CATEGORY_CODE_TAKEN");
    const emp = await as(s.employee, "POST", "/v1/expense-categories",
      { ...body, code: "taxi" });
    expect(emp.body.error.code).toBe("FORBIDDEN");
    const list = await as(s.employee, "GET", "/v1/expense-categories");
    expect(list.body.items.map((c: { code: string }) => c.code))
      .toEqual(["fuel"]);
  });

  it("hr patches a category", async () => {
    const r = await as(s.hr, "PATCH", `/v1/expense-categories/${fuel}`,
      { active: false, nameAr: "وقود" });
    expect(r.status, r.text).toBe(200);
    expect(r.body).toMatchObject({ active: false, nameAr: "وقود",
      name: "Fuel" });
    const missing = await as(s.hr, "PATCH",
      "/v1/expense-categories/00000000-0000-4000-8000-0000000000ff",
      { active: true });
    expect(missing.status).toBe(404);
  });

  it("the policy starts empty at version 0", async () => {
    const r = await as(s.employee, "GET", "/v1/expense-policy");
    expect(r.status, r.text).toBe(200);
    expect(r.body).toEqual({ version: 0, claimWindowDays: null,
      limits: [], mileageRates: [], perDiemRates: [] });
  });

  it("put is optimistic and validated", async () => {
    const ok = await as(s.hr, "PUT", "/v1/expense-policy", policy());
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.version).toBe(1);
    expect(ok.body.limits[0].perItemMax).toBe("300.00");
    const stale = await as(s.hr, "PUT", "/v1/expense-policy", policy());
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("POLICY_VERSION_CONFLICT");
    const bad = await as(s.hr, "PUT", "/v1/expense-policy", policy({
      expectedVersion: 1, limits: [{ ...policy().limits[0],
        categoryId: "00000000-0000-4000-8000-0000000000ff" }] }));
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe("POLICY_INVALID");
    expect(bad.body.error.detail.paths).toContain("limits.0.categoryId");
  });

  it("duplicate limits and rates, and zero rates, are refused", async () => {
    const lim = policy().limits[0];
    const rate = policy().mileageRates[0];
    const r = await as(s.hr, "PUT", "/v1/expense-policy", policy({
      expectedVersion: 1, limits: [lim, lim],
      mileageRates: [rate, rate, { ...rate, effectiveFrom: "2026-02-01",
        perKm: "0.00" }] }));
    expect(r.status).toBe(422);
    expect(r.body.error.detail.paths).toEqual(["limits.1",
      "mileageRates.1", "mileageRates.2.perKm"]);
  });

  it("employees cannot change the policy; audit holds no amount",
    async () => {
      const r = await as(s.employee, "PUT", "/v1/expense-policy",
        policy({ expectedVersion: 1 }));
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe("FORBIDDEN");
      const log = await as(s.owner, "GET", "/v1/audit-events?limit=20");
      const e = log.body.items.find((x: { action: string }) =>
        x.action === "expense-policy.updated");
      expect(e.data).toEqual({ version: 1, limitCount: 1, rateCount: 1 });
      const text = JSON.stringify(log.body.items.filter(
        (x: { action: string }) => x.action.startsWith("expense-"))
        .map((x: { data: unknown }) => x.data));
      expect(text).not.toMatch(/\d+\.\d{2}/);
      expect(log.body.items.some((x: { action: string; data: unknown }) =>
        x.action === "expense-category.updated")).toBe(true);
    });
});
