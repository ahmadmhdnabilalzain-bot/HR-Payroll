import { afterAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { dispatch } from "./helpers/channel-jobs";
import {
  EXPENSE_START,
  meal,
  setupExpenses,
  submitted,
} from "./helpers/expense-fixtures";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { seedCompany } from "./helpers/seed";
import { makeApp } from "./helpers/test-app";

/**
 * Plan 13's cross-company jobs run SECURITY DEFINER functions as the
 * table owner. Forced RLS applies to that (non-superuser) owner, so
 * only real PostgreSQL shows whether the job-scan policies work.
 */
describe.skipIf(!ADMIN_URL)("Plan 13 jobs on real PostgreSQL", () => {
  afterAll(closeAll);

  it("due deliveries of two companies are found and sent", async () => {
    const { db } = await freshPgPair(4);
    const ctx = await makeApp({ db, start: EXPENSE_START });
    const ids: string[] = [];
    for (const name of ["pgja", "pgjb"]) {
      const s = await seedCompany(ctx, name);
      const cats = await setupExpenses(ctx, s);
      await submitted(ctx, s.employee, s, [meal(cats, "6.00")]);
      ids.push(s.companyId);
    }
    const due = await withTenant(db, { companyId: null, userId: null },
      (tx) => tx.query<{ company_id: string }>(
        "SELECT * FROM due_notification_deliveries($1, 100)",
        [ctx.clock.now.toISOString()]));
    expect([...new Set(due.map((d) => d.company_id))].sort())
      .toEqual(ids.sort());
    expect((await dispatch(ctx)).sent).toBe(2);
  });

  it("the runtime role cannot read deliveries without a tenant",
    async () => {
      const { db } = await freshPgPair(1);
      const ctx = await makeApp({ db, start: EXPENSE_START });
      const s = await seedCompany(ctx, "pgjc");
      const cats = await setupExpenses(ctx, s);
      await submitted(ctx, s.employee, s, [meal(cats, "6.00")]);
      const rows = await withTenant(db, { companyId: null, userId: null },
        (tx) => tx.query("SELECT * FROM notification_deliveries"));
      expect(rows).toEqual([]);
    });
});
