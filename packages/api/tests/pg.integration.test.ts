import { afterAll, describe, expect, it } from "vitest";
import { assertRuntimeRole } from "../src/db/role-check";
import { withTenant } from "../src/db/tenant";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { tenancyCases } from "./helpers/tenancy-cases";
import { COMPANY_A, seedTwoCompanies } from "./helpers/test-db";
import { pgConcurrencyCases } from "./helpers/pg-concurrency";
import { pgHrConcurrencyCases } from "./helpers/pg-concurrency-hr";

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

  describe("concurrency", () => {
    pgConcurrencyCases(() => freshPgPair(10));
    pgHrConcurrencyCases(() => freshPgPair(10));
  });
});
