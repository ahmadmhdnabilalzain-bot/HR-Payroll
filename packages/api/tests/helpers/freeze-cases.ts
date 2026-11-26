import { expect, it } from "vitest";
import type { Db } from "../../src/db/db";
import { withTenant } from "../../src/db/tenant";
import { createClaim, meal, submitted } from "./expense-fixtures";
import { claimOf, MARCH, world, type World } from "./reimb-world";
import { postRun } from "./seed";

/** The app's handle and an RLS-bypassing admin (pglite: the same). */
export interface GuardDbs { db?: Db; admin?: Db }

const asApp = (w: World, sql: string, args: unknown[]) =>
  withTenant(w.ctx.deps.db, { companyId: w.s.companyId,
    userId: w.s.hr.userId }, (tx) => tx.query(sql, args));

/**
 * Database guards beside the code (money review I-2 and M-7, security
 * review I-3), run as the app role inside the claim's own tenant.
 * Shared by the pglite and real-PostgreSQL suites.
 */
export function guardCases(open: () => Promise<GuardDbs>): void {
  it("items and amounts of a decided claim are frozen", async () => {
    const dbs = await open();
    const w = await world("freeze", dbs.db);
    const id = await claimOf(w, "250.00");
    const draft = await createClaim(w.ctx, w.s.employee, w.s,
      [meal(w.cats, "5.00")]);
    await expect(asApp(w, "UPDATE expense_items SET amount = 1 " +
      "WHERE claim_id = $1", [id])).rejects.toThrow(/frozen/);
    for (const set of ["total = 1", "title = 'x'", "revision = 9"]) {
      await expect(asApp(w, `UPDATE expense_claims SET ${set} WHERE id = $1`,
        [id]), set).rejects.toThrow(/frozen/);
    }
    await expect(asApp(w, `INSERT INTO expense_items (id, company_id,
      claim_id, revision, idx, kind, category_id, date, description,
      amount, vat_amount) SELECT gen_random_uuid(), company_id, claim_id,
      9, 0, kind, category_id, date, description, 1, 0 FROM expense_items
      WHERE claim_id = $1 LIMIT 1`, [id])).rejects.toThrow(/frozen/);
    const ok = await asApp(w, "UPDATE expense_items SET amount = 600 " +
      "WHERE claim_id = $1 RETURNING id", [draft.body.id]);
    expect(ok.length).toBe(1);
    await expect(asApp(w, "UPDATE expense_items SET vat_amount = 1 " +
      "WHERE claim_id = $1", [draft.body.id]))
      .rejects.toThrow(/permission denied/);
    // Past the grants (admin): the CHECK still holds.
    await expect((dbs.admin ?? w.ctx.deps.db).query("UPDATE expense_items " +
      "SET vat_amount = 601 WHERE claim_id = $1", [draft.body.id]))
      .rejects.toThrow(/check/i);
  });

  it("a linked claim leaves its run only when the run is void",
    async () => {
      const w = await world("link", (await open()).db);
      const id = await claimOf(w, "40.00");
      const run = await postRun(w.ctx, w.s.hr, w.s, "g-1", MARCH);
      expect(run.body.claimCount).toBe(1);
      await expect(asApp(w, "UPDATE expense_claims SET pay_run_id = NULL " +
        "WHERE id = $1", [id])).rejects.toThrow(/void/);
      await expect(asApp(w, "UPDATE expense_claims SET status = " +
        "'reimbursed' WHERE id = $1", [id])).rejects.toThrow(/approved/);
      await expect(asApp(w, "UPDATE expense_claims SET employee_id = $2 " +
        "WHERE id = $1", [id, w.s.emp.report2]))
        .rejects.toThrow(/permission denied/);
    });

  it("approval key columns are not writable; deciders are checked",
    async () => {
      const dbs = await open();
      const w = await world("spine", dbs.db);
      // An open request: its key columns must still be immutable.
      const c = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "9.00")]);
      const r = { approval_id: c.approval.id as string };
      for (const sql of [
        "UPDATE approval_steps SET eligible = '{}' WHERE request_id = $1",
        "UPDATE approval_requests SET submitted_by = gen_random_uuid() " +
          "WHERE id = $1",
        "UPDATE approval_requests SET excluded = '{}' WHERE id = $1"]) {
        await expect(asApp(w, sql, [r!.approval_id]), sql).rejects
          .toThrow(/permission denied/);
      }
      await decidedBySubmitterRefused(w, dbs.admin ?? w.ctx.deps.db);
    });
}

/** A step whose eligible list holds an excluded user still refuses
 * that user as decider (the trigger, not only the code). */
async function decidedBySubmitterRefused(w: World, admin: Db) {
  const c = w.s.companyId;
  const u = w.s.hr.userId;
  const req = "00000000-0000-4000-a000-000000000001";
  await admin.query(`INSERT INTO approval_requests (id, company_id,
      subject_type, subject_id, status, current_step, submitted_by,
      claimant_employee_id, created_at, excluded)
    VALUES ($1, $2, 'expense-claim', $1, 'pending', 1, $3, $4,
      '2026-03-20T08:00:00Z', ARRAY[$3::uuid])`,
  [req, c, u, w.s.emp.report]);
  await admin.query(`INSERT INTO approval_steps (company_id, request_id,
      step_order, approver, eligible, status) VALUES ($1, $2, 1,
      '{"kind":"role","role":"hr"}', ARRAY[$3::uuid], 'pending')`,
  [c, req, u]);
  await expect(asApp(w, `UPDATE approval_steps SET status = 'approved',
    decided_by = $2, decided_at = '2026-03-20T08:00:00Z'
    WHERE request_id = $1`, [req, u])).rejects.toThrow(/may not decide/);
}
