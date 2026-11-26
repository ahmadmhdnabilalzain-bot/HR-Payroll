import { expect, it } from "vitest";
import { exitFixtures, MIN_NOTICE } from "./exit-fixtures";
import { addOwner, salaryOf, seedCompany } from "./seed";
import { call, makeApp } from "./test-app";
import type { DbPair } from "./test-db";

const statuses = (rs: { status: number }[]) =>
  rs.map((r) => r.status).sort((a, b) => a - b);

/** Plan 8 races that pglite cannot show (one transaction at a time). */
export function pgHrConcurrencyCases(open: () => Promise<DbPair>): void {
  it("hire sent twice at once: one employee, both get its id",
    async () => {
      const pair = await open();
      const ctx = await makeApp({ db: pair.db });
      const s = await seedCompany(ctx, "hirerace");
      const fx = exitFixtures(ctx, s);
      const req = await fx.must(fx.by(s.hr, "POST", "/v1/requisitions",
        { title: "Ops", headcount: 2,
          hiringManagerUserId: s.manager.userId }), 201);
      await fx.must(fx.by(s.owner, "POST",
        `/v1/requisitions/${req.id}/decision`, { approve: true }));
      const c = await fx.must(fx.by(s.hr, "POST", "/v1/candidates",
        { fullName: "Racer", source: "direct" }), 201);
      const a = await fx.must(fx.by(s.hr, "POST", "/v1/applications",
        { requisitionId: req.id, candidateId: c.id }), 201);
      await fx.must(fx.by(s.hr, "POST", `/v1/applications/${a.id}/stage`,
        { stage: "offer" }));
      const o = await fx.must(fx.by(s.hr, "POST", "/v1/offers", {
        applicationId: a.id, jobTitle: "Ops", startDate: "2026-04-01",
        salary: salaryOf("5000.00").components, probationMonths: 0,
        contractNoticeDays: MIN_NOTICE }), 201);
      await fx.must(fx.by(s.owner, "POST", `/v1/offers/${o.id}/decision`,
        { approve: true }));
      await fx.must(fx.by(s.hr, "POST", `/v1/offers/${o.id}/response`,
        { accepted: true, respondedOn: "2026-03-01" }));
      const body = { number: "R-1", nationality: "IN",
        workerClass: "expat-full-time" };
      const rs = await Promise.all([1, 2].map(() => call(ctx.app,
        s.hr.token, s.companyId, "POST", `/v1/offers/${o.id}/hire`, body)));
      expect(statuses(rs)).toEqual([200, 201]);
      expect(rs[0]!.body.employee.id).toBe(rs[1]!.body.employee.id);
      const rows = await pair.admin.query(
        "SELECT 1 FROM employees WHERE company_id = $1 AND number = 'R-1'",
        [s.companyId]);
      expect(rows.length).toBe(1);
    });

  // Each owner revokes the other's exit at once (review I-2, I-3: no
  // one revokes their own access, only owners revoke owners). The
  // loser gets 409 LAST_OWNER, or 403 when its own access went first.
  it("two owner-leavers revoked at once keep one owner", async () => {
    const pair = await open();
    const ctx = await makeApp({ db: pair.db });
    const s = await seedCompany(ctx, "ownrace");
    const owner2 = await addOwner(ctx, s);
    const fx = exitFixtures(ctx, s);
    const [ea, eb] = [await fx.staff(), await fx.staff()];
    const link = (user: string, emp: string) => fx.by(s.owner, "PATCH",
      `/v1/users/${user}/employee`, { employeeId: emp });
    await fx.must(link(s.owner.userId, ea));
    await fx.must(link(owner2.userId, eb));
    const xa = await fx.approvedExit(ea, "2026-03-01", owner2);
    const xb = await fx.approvedExit(eb, "2026-03-01", s.owner);
    const rs = await Promise.all([[xa, owner2], [xb, s.owner]].map(
      ([x, who]) => call(ctx.app, who.token, s.companyId, "POST",
        `/v1/exits/${x.id}/revoke-access`, {})));
    const st = statuses(rs);
    expect(st[0]).toBe(200);
    expect([403, 409]).toContain(st[1]);
    const owners = await pair.admin.query(
      `SELECT 1 FROM memberships WHERE company_id = $1 AND role = 'owner'
       AND revoked_at IS NULL`, [s.companyId]);
    expect(owners.length).toBe(1);
  });
}
