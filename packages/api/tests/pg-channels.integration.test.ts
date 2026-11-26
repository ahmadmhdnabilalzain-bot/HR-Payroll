import { afterAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { dispatch, enableWhatsApp, optIn } from "./helpers/channel-jobs";
import {
  EXPENSE_START,
  meal,
  setupExpenses,
  submitted,
} from "./helpers/expense-fixtures";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { seedCompany } from "./helpers/seed";
import { COMPANY_A, seedTwoCompanies } from "./helpers/test-db";
import { call, makeApp } from "./helpers/test-app";

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

  it("every cross-company function sees both companies", async () => {
    const { db, admin } = await freshPgPair(2);
    await seedTwoCompanies(admin);
    const later = "2099-01-01T00:00:00.000Z";
    await admin.exec(`
      UPDATE channel_opt_ins SET phone_hash = 'hx', status = 'active';
      UPDATE channel_actions SET phone_hash = 'hx',
        status = 'awaiting-reason', reason_until = '${later}';
      UPDATE webhook_deliveries SET status = 'pending',
        next_attempt_at = '2026-01-01T00:00:00Z';
      UPDATE sso_settings SET body =
        '{"jitEmployees":true,"allowedDomains":["acme.test"]}';
      UPDATE employees SET email = 'e@acme.test';
      UPDATE memberships SET employee_id = NULL;
      UPDATE sso_domains SET status = 'verified'
        WHERE company_id = '${COMPANY_A}';`);
    const q = (sql: string, args: unknown[] = []) => withTenant(db,
      { companyId: null, userId: null }, (tx) =>
        tx.query<Record<string, unknown>>(sql, args));
    const now = "2026-03-01T08:00:00.000Z";
    const two = (rows: Record<string, unknown>[]) =>
      new Set(rows.map((r) => r.company_id)).size;
    // Up to two rows, so a second waiting reject is noticed (M8).
    expect(two(await q("SELECT * FROM find_awaiting_reason('hx', $1)",
      [now]))).toBe(2);
    expect(two(await q("SELECT * FROM due_webhook_deliveries($1, 10)",
      [now]))).toBe(2);
    // Only the company that verified the domain (review I4).
    expect(await q(
      "SELECT * FROM sso_jit_candidates('e@acme.test', 'acme.test')"))
      .toEqual([{ company_id: COMPANY_A }]);
    expect(await q("SELECT expire_awaiting_by_phone('hx') AS n"))
      .toEqual([{ n: 2 }]);
    expect(await q("SELECT withdraw_whatsapp_by_phone('hx', $1) AS n",
      [now])).toEqual([{ n: 2 }]);
  });

  it("I2: verifying a number in B ends A's opt-in (tenant tx)",
    async () => {
      const { db } = await freshPgPair(2);
      const ctx = await makeApp({ db, start: EXPENSE_START });
      const a = await seedCompany(ctx, "pgwa");
      const b = await seedCompany(ctx, "pgwb");
      await enableWhatsApp(ctx, a);
      await enableWhatsApp(ctx, b);
      await optIn(ctx, a, a.manager, "+971500000041");
      await optIn(ctx, b, b.hr, "+971500000041");
      const ma = await call(ctx.app, a.manager.token, a.companyId, "GET",
        "/v1/me/channels");
      expect(ma.body.whatsapp.status).toBe("withdrawn");
      const hb = await call(ctx.app, b.hr.token, b.companyId, "GET",
        "/v1/me/channels");
      expect(hb.body.whatsapp.status).toBe("active");
    });

  it("I4: a domain verified in A cannot be claimed by B (tenant tx)",
    async () => {
      const { db } = await freshPgPair(2);
      const ctx = await makeApp({ db, start: EXPENSE_START });
      const a = await seedCompany(ctx, "pgda");
      const b = await seedCompany(ctx, "pgdb");
      const add = await call(ctx.app, a.owner.token, a.companyId, "POST",
        "/v1/sso-settings/domains", { domain: "pg.test" });
      const d = add.body.domains[0];
      ctx.fakes.txt.set(d.txtName, [d.txtValue]);
      const ok = await call(ctx.app, a.owner.token, a.companyId, "POST",
        "/v1/sso-settings/domains/verify", { domain: "pg.test" });
      expect(ok.status, ok.text).toBe(200);
      const claim = await call(ctx.app, b.owner.token, b.companyId, "POST",
        "/v1/sso-settings/domains", { domain: "pg.test" });
      expect(claim.body.error.code).toBe("SSO_DOMAIN_CLAIMED");
    });

  it("M9: the purge removes old counters of both companies", async () => {
    const { db, admin } = await freshPgPair(2);
    await seedTwoCompanies(admin);
    await admin.exec(`UPDATE rate_counters SET window_start = 0`);
    const before = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_counters");
    expect(before[0]!.n).toBeGreaterThanOrEqual(2);
    const [r] = await withTenant(db, { companyId: null, userId: null },
      (tx) => tx.query<{ counters: number }>(
        "SELECT * FROM purge_channel_state($1)",
        ["2026-03-01T08:00:00.000Z"]));
    expect(r!.counters).toBe(before[0]!.n);
    const after = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_counters");
    expect(after[0]!.n).toBe(0);
  });
});
