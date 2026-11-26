import { afterAll, describe, expect, it } from "vitest";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { addOwner, seedCompany } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";
import {
  addSubject,
  installTestSubjects,
  openFor,
  testSubjects,
} from "./helpers/test-subject";

/**
 * Plan 6 races that pglite cannot show (it runs one transaction at a
 * time): real PostgreSQL, non-superuser runtime role.
 */
describe.skipIf(!ADMIN_URL)("Plan 6 on real PostgreSQL", () => {
  afterAll(closeAll);

  it("two owners approving one step at once: one wins", async () => {
    const { db, admin } = await freshPgPair();
    await installTestSubjects(admin);
    const subj = testSubjects();
    const ctx = await makeApp({ db, subjects: [subj.handler] });
    const s = await seedCompany(ctx, "pgspine");
    const o2 = await addOwner(ctx, s);
    const r = await call(ctx.app, s.owner.token, s.companyId, "PUT",
      "/v1/approval-chains/expense-claim", { tiers: [{ approver:
        { kind: "role", role: "owner" }, minTotal: "0.00" }],
      overLimitApprover: "owner", expectedVersion: 0 });
    expect(r.status, r.text).toBe(200);
    for (let round = 0; round < 5; round++) {
      const id = await addSubject(admin, s.companyId, s.emp.report, 100n);
      const v = await openFor(ctx.deps, subj, s.companyId,
        s.employee.userId, id);
      const rs = await Promise.all([s.owner, o2].map((u) =>
        call(ctx.app, u.token, s.companyId, "POST",
          `/v1/approvals/${v.id}/approve`, { stepOrder: 1 })));
      expect(rs.map((x) => x.status).sort(), rs.map((x) => x.text).join())
        .toEqual([200, 409]);
      const steps = await admin.query<{ decided_by: string | null }>(
        "SELECT decided_by FROM approval_steps WHERE request_id = $1",
        [v.id]);
      expect(steps.filter((x) => x.decided_by !== null).length).toBe(1);
    }
    const done = subj.outcomes.filter((o) => o.outcome === "approved");
    expect(done.length).toBe(5);
  });
});
