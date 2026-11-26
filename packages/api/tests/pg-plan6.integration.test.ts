import { afterAll, describe, expect, it } from "vitest";
import {
  approvedClaim,
  claimAction,
  createClaim,
  EXPENSE_START,
  meal,
  setLimits,
  setupExpenses,
  submitted,
} from "./helpers/expense-fixtures";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import {
  APRIL,
  as,
  claimOf,
  MARCH,
  world,
} from "./helpers/reimb-world";
import { addOwner, postRun, seedCompany } from "./helpers/seed";
import { call, callBytes, makeApp } from "./helpers/test-app";
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

  it("March and April runs created at once pay each claim once",
    async () => {
      const { db, admin } = await freshPgPair();
      const w = await world("pgruns", db);
      const ids: string[] = [];
      for (const a of ["10.00", "20.00", "30.00"]) {
        ids.push(await claimOf(w, a));
      }
      const rs = await Promise.all([
        postRun(w.ctx, w.s.hr, w.s, "pg-m", MARCH),
        postRun(w.ctx, w.s.hr, w.s, "pg-a", APRIL)]);
      expect(rs.map((r) => r.status), rs.map((r) => r.text).join())
        .toEqual([201, 201]);
      expect(rs[0]!.body.claimCount + rs[1]!.body.claimCount).toBe(3);
      const rows = await admin.query<{ id: string; pay_run_id: string }>(
        `SELECT id, pay_run_id FROM expense_claims WHERE company_id = $1
           AND pay_run_id IS NOT NULL`, [w.s.companyId]);
      expect(rows.map((r) => r.id).sort()).toEqual(ids.sort());
      const runs = new Set(rs.map((r) => r.body.id));
      for (const r of rows) expect(runs.has(r.pay_run_id)).toBe(true);
    });

  it("a cancel racing the last approval: one wins, no deadlock",
    async () => {
      const { db } = await freshPgPair();
      const w = await world("pgcancel", db);
      for (let round = 0; round < 4; round++) {
        const c = await submitted(w.ctx, w.s.employee, w.s,
          [meal(w.cats, "11.00")]);
        const rs = await Promise.all([
          claimAction(w.ctx, w.s.employee, w.s, c.id, "cancel"),
          call(w.ctx.app, w.s.manager.token, w.s.companyId, "POST",
            `/v1/approvals/${c.approval.id}/approve`, { stepOrder: 1 })]);
        const codes = rs.map((r) => r.status);
        expect(codes.filter((x) => x === 200).length, rs.map((r) =>
          r.text).join()).toBe(1);
        expect(codes.every((x) => [200, 403, 409].includes(x))).toBe(true);
      }
    });

  it("smoke: receipts, list filters and reports on PostgreSQL", async () => {
    const { db } = await freshPgPair();
    const w = await world("pgsmoke", db);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a,
      0x0a, 7]).toString("base64");
    const up = await as(w, w.s.employee, "POST", "/v1/receipts", {
      fileName: "r.png", contentType: "image/png", dataBase64: png });
    expect(up.status, up.text).toBe(201);
    const id = await approvedClaim(w.ctx, w.s.employee, w.s.manager, w.s,
      [meal(w.cats, "50.00", { vatAmount: "2.38", receiptIds: [up.body.id],
        supplierTrn: "100000000000003" })]);
    const list = await as(w, w.s.hr, "GET", "/v1/expense-claims" +
      `?status=approved&from=2026-03-01&to=2026-03-31`);
    expect(list.body.items.map((x: { id: string }) => x.id)).toEqual([id]);
    const run = await postRun(w.ctx, w.s.hr, w.s, "pg-smoke", MARCH);
    expect(run.body.claimCount).toBe(1);
    const q = "from=2026-03-01&to=2026-03-31";
    const sum = await as(w, w.s.hr, "GET",
      `/v1/expense-reports/summary?${q}&groupBy=department`);
    expect(sum.body.total, sum.text).toBe("50.00");
    const vat = await as(w, w.s.hr, "GET",
      `/v1/expense-reports/vat-register?${q}`);
    expect(vat.body.rows[0]).toMatchObject({ netOfVat: "47.62",
      receiptCount: 1 });
    const pay = await as(w, w.s.hr, "GET",
      `/v1/expense-reports/payouts?payRunId=${run.body.id}`);
    expect(pay.body.rows[0]).toMatchObject({ claimIds: [id],
      total: "50.00" });
    for (const path of ["aging", "unpaid"]) {
      const r = await as(w, w.s.hr, "GET", `/v1/expense-reports/${path}`);
      expect(r.status, r.text).toBe(200);
    }
    const dl = await callBytes(w.ctx.app, w.s.manager.token, w.s.companyId,
      `/v1/receipts/${up.body.id}/content`);
    expect(dl.status).toBe(200);
    expect(Buffer.from(dl.bytes).toString("base64")).toBe(png);
  });

  it("two claims submitted at once share one monthly limit", async () => {
    const { db } = await freshPgPair();
    const ctx = await makeApp({ db, start: EXPENSE_START });
    const s = await seedCompany(ctx, "pgmonth");
    const cats = await setupExpenses(ctx, s);
    await setLimits(ctx, s, [{ categoryId: cats.meals, role: null,
      perItemMax: null, monthlyMax: "500.00", receiptRequiredAbove: null,
      overLimit: "block" }]);
    const ids: string[] = [];
    for (const amount of ["300.00", "300.00"]) {
      const c = await createClaim(ctx, s.employee, s, [meal(cats, amount)]);
      ids.push(c.body.id);
    }
    const rs = await Promise.all(ids.map((id) =>
      claimAction(ctx, s.employee, s, id, "submit")));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 422]);
  });
});
