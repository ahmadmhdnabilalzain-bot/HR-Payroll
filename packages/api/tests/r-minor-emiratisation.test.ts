import { describe, expect, it } from "vitest";
import { seedCompany } from "./helpers/seed";
import { seedHeadcount } from "./helpers/seed-headcount";
import { call, makeApp } from "./helpers/test-app";

/**
 * Review M-E1 and M-E2: top-level figures carry their source status,
 * and an on-target status or a zero fine is never shown without
 * planning-estimate wording.
 */
describe("Emiratisation figures say where they come from", () => {
  it("labels required and the fine; notes every status and fine",
    async () => {
      const ctx = await makeApp({ start: "2025-08-01T08:00:00.000Z" });
      const s = await seedCompany(ctx, "rme");
      await seedHeadcount(ctx, s, 55, { nationals: 4, skilled: 40 });
      await call(ctx.app, s.owner.token, s.companyId, "PUT",
        "/v1/emiratisation/settings", { sectorInScope: null,
          overrides: { largeRequiredRounding: "DOWN" } });
      const r = await call(ctx.app, s.hr.token, s.companyId, "GET",
        "/v1/emiratisation");
      expect(r.status, r.text).toBe(200);
      expect(r.body).toMatchObject({ checkpoint: "2025-12-31",
        status: "on-target", fineExposure: "0.00" });
      expect(r.body.figureStatus.required).toEqual(
        ["company-entered", "convention"]);
      // A zero fine follows from the required count it rests on.
      expect(r.body.figureStatus.fineExposure).toEqual(
        ["company-entered", "convention"]);
      expect(r.body.statusNote).toMatch(/planning estimate/i);
      expect(r.body.statusNote).toMatch(/not a compliance finding/i);
      expect(r.body.fineNote).toMatch(/planning estimate/i);
    });
});
