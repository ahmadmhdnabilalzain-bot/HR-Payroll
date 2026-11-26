import { ROUTES } from "@payroll/contract";
import { afterAll, describe, expect, it } from "vitest";
import { assertRuntimeRole } from "../src/db/role-check";
import { withTenant } from "../src/db/tenant";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { tenancyCases } from "./helpers/tenancy-cases";
import { COMPANY_A, seedTwoCompanies } from "./helpers/test-db";
import { pgConcurrencyCases } from "./helpers/pg-concurrency";
import { recorder, runFlow, type Hit } from "./helpers/api-flow";
import { makeApp } from "./helpers/test-app";

describe.skipIf(!ADMIN_URL)("real PostgreSQL, non-superuser runtime", () => {
  afterAll(closeAll);

  // One connection, so "leaves no app.company_id behind" reads the
  // very connection withTenant used.
  describe("tenancy", () => {
    tenancyCases(() => freshPgPair(1));
  });

  it("the runtime role passes the startup check; the admin fails",
    async () => {
      const { db, admin } = await freshPgPair(1);
      await expect(assertRuntimeRole(db)).resolves.toBeUndefined();
      await expect(assertRuntimeRole(admin)).rejects.toThrow(/superuser/);
    });

  it("outside withTenant, or after RESET ROLE, the runtime reads nothing",
    async () => {
      const { db, admin } = await freshPgPair(1);
      await seedTwoCompanies(admin);
      // The runtime role has no schema usage of its own: the tables
      // are not even visible to it outside SET ROLE payroll_app.
      const hidden = /permission denied|does not exist/;
      await expect(db.query("SELECT * FROM companies"))
        .rejects.toThrow(hidden);
      const reset = withTenant(db, { companyId: COMPANY_A, userId: null },
        async (tx) => {
          await tx.query("RESET ROLE");
          return tx.query("SELECT * FROM companies");
        });
      await expect(reset).rejects.toThrow(hidden);
      await expect(db.query("TRUNCATE audit_events"))
        .rejects.toThrow(/permission denied|must be owner|does not exist/);
    });

  it("every route works as the runtime role (whole-API flow)",
    async () => {
      const { db } = await freshPgPair(4);
      const ctx = await makeApp({ db });
      const hits: Hit[] = [];
      await runFlow(ctx, recorder(ctx, hits));
      for (const r of ROUTES) {
        const ok = hits.find((h) => h.id === r.id && h.res.status < 300);
        expect(ok, `${r.id}: ${hits.filter((h) => h.id === r.id)
          .map((h) => h.res.text).join(" | ")}`).toBeDefined();
      }
      const server = hits.filter((h) => h.res.status >= 500);
      expect(server.map((h) => h.id)).toEqual([]);
    });

  describe("concurrency", () => {
    pgConcurrencyCases(() => freshPgPair(10));
  });
});
