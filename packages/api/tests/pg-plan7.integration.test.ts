import { afterAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { claimFile, type FileCtx } from "../src/files/files";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { seedCompany } from "./helpers/seed";
import { fakePdf, makeApp, upload } from "./helpers/test-app";

/**
 * Plan 7 races that pglite cannot show (it runs one transaction at a
 * time): real PostgreSQL, non-superuser runtime role.
 */
describe.skipIf(!ADMIN_URL)("Plan 7 on real PostgreSQL", () => {
  afterAll(closeAll);

  it("two claims of one file at once: one wins, one gets 409",
    async () => {
      const { db } = await freshPgPair(4);
      const ctx = await makeApp({ db });
      const s = await seedCompany(ctx, "pgfiles");
      const f = await upload(ctx.app, s.hr.token, s.companyId, "r.pdf",
        fakePdf("race"));
      const claim = (n: number) => withTenant(db, { companyId: s.companyId,
        userId: s.hr.userId }, (tx) => claimFile({ tx, deps: ctx.deps,
        user: { id: s.hr.userId }, tenant: { companyId: s.companyId,
          role: "hr", employeeId: null } } as unknown as FileCtx, f.id,
      `test:00000000-0000-4000-8000-00000000f00${n}`));
      const out = await Promise.allSettled([claim(1), claim(2)]);
      expect(out.filter((x) => x.status === "fulfilled").length).toBe(1);
      const lost = out.find((x) => x.status === "rejected");
      expect((lost as PromiseRejectedResult).reason).toMatchObject({
        code: "FILE_NOT_AVAILABLE" });
    });
});
