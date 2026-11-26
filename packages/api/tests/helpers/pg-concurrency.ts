import { expect, it } from "vitest";
import { appendAudit } from "../../src/audit/audit";
import { verifyChain } from "../../src/audit/audit";
import { withTenant } from "../../src/db/tenant";
import {
  call,
  enableMfa,
  enrolOnly,
  login,
  makeApp,
  PASSWORD,
  signup,
} from "./test-app";
import {
  COMPANY_A,
  USER_A,
  seedTwoBareCompanies,
  type DbPair,
} from "./test-db";

const salaryBody = (amount: string) => ({ components: [{ code: "basic",
  label: "B", labelAr: null, amount, sifBucket: "fixed" }] });

const statuses = (rs: { status: number }[]) =>
  rs.map((r) => r.status).sort((a, b) => a - b);

/** Races that pglite cannot show (it runs one transaction at a time). */
export function pgConcurrencyCases(open: () => Promise<DbPair>): void {
  it("20 parallel wrong passwords: 5 counted, then locked", async () => {
    const ctx = await makeApp({ db: (await open()).db });
    const a = await signup(ctx.app, "race");
    const rs = await Promise.all(Array.from({ length: 20 }, () =>
      login(ctx.app, a.email, "wrong password!!")));
    const s = statuses(rs);
    expect(s.filter((x) => x === 401).length).toBe(5);
    expect(s.filter((x) => x === 423).length).toBe(15);
    expect((await login(ctx.app, a.email, PASSWORD)).status).toBe(423);
  });

  it("one TOTP code sent twice at once signs in once", async () => {
    const ctx = await makeApp({ db: (await open()).db });
    const a = await signup(ctx.app, "totp");
    const code = await enrolOnly(ctx.app, ctx.clock, a.token);
    ctx.clock.advance(30_000);
    const c = code();
    const rs = await Promise.all([login(ctx.app, a.email, PASSWORD, c),
      login(ctx.app, a.email, PASSWORD, c)]);
    expect(statuses(rs)).toEqual([200, 401]);
  });

  it("parallel accepts of one invite: one 200, the rest 410", async () => {
    const ctx = await makeApp({ db: (await open()).db });
    const a = await signup(ctx.app, "inv");
    const inv = await call(ctx.app, a.token, a.companyId, "POST",
      "/v1/users/invite", { email: "new@example.com", role: "hr" });
    const body = { setupToken: inv.body.setupToken, password: PASSWORD,
      displayName: "New" };
    const rs = await Promise.all([1, 2, 3].map(() => call(ctx.app, null,
      null, "POST", "/v1/auth/accept-invite", body)));
    expect(statuses(rs)).toEqual([200, 410, 410]);
  });

  it("two owners demoting each other at once keep one owner", async () => {
    const ctx = await makeApp({ db: (await open()).db });
    const a = await signup(ctx.app, "own");
    const inv = await call(ctx.app, a.token, a.companyId, "POST",
      "/v1/users/invite", { email: "own2@example.com", role: "owner" });
    const b = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.body.setupToken,
        password: PASSWORD, displayName: "Owner Two" });
    const ta = (await enableMfa(ctx.app, ctx.clock, a)).token;
    const tb = (await enableMfa(ctx.app, ctx.clock, { token: b.body.token,
      email: "own2@example.com" })).token;
    const rs = await Promise.all([
      call(ctx.app, ta, a.companyId, "PATCH",
        `/v1/users/${b.body.user.id}`, { role: "hr" }),
      call(ctx.app, tb, a.companyId, "PATCH", `/v1/users/${a.userId}`,
        { role: "hr" })]);
    // The loser either sees one owner left (409 LAST_OWNER) or, when
    // the winner committed first, is no longer an owner (403).
    const [win, lose] = statuses(rs);
    expect(win).toBe(200);
    expect([403, 409]).toContain(lose);
    const winner = rs.find((r) => r.status === 200)!;
    const tokenOf = winner === rs[0] ? ta : tb;
    const users = await call(ctx.app, tokenOf, a.companyId, "GET",
      "/v1/users");
    expect(users.body.items.filter((u: { role: string }) =>
      u.role === "owner").length).toBe(1);
  });

  it("one Idempotency-Key sent twice at once: one run, 201 and 200",
    async () => {
      const { db, admin } = await open();
      const ctx = await makeApp({ db });
      const a = await signup(ctx.app, "idem");
      const e = await call(ctx.app, a.token, a.companyId, "POST",
        "/v1/employees", { number: "E-1", fullName: "P", jobTitle: "C",
          nationality: "IN", workerClass: "expat-full-time",
          joiningDate: "2019-01-01" });
      await call(ctx.app, a.token, a.companyId, "PUT",
        `/v1/employees/${e.body.id}/salary`, { components: [{ code: "basic",
          label: "B", labelAr: null, amount: "4000.00",
          sifBucket: "fixed" }] });
      const post = () => call(ctx.app, a.token, a.companyId, "POST",
        "/v1/pay-runs", { period: { year: 2026, month: 3 }, entries: [] },
        { "idempotency-key": "same" });
      const rs = await Promise.all([post(), post()]);
      expect(statuses(rs)).toEqual([200, 201]);
      expect(rs[0]!.body.id).toBe(rs[1]!.body.id);
      const n = await admin.query<{ n: bigint }>(
        "SELECT count(*) AS n FROM pay_runs");
      expect(n[0]?.n).toBe(1n);
      const slips = await admin.query<{ n: bigint }>(
        "SELECT count(*) AS n FROM payslips");
      expect(slips[0]?.n).toBe(1n);
    });

  it("a salary change racing an approval is never missed", async () => {
    const { db, admin } = await open();
    const ctx = await makeApp({ db });
    const a = await signup(ctx.app, "race2");
    const ta = (await enableMfa(ctx.app, ctx.clock, a)).token;
    const inv = await call(ctx.app, ta, a.companyId, "POST",
      "/v1/users/invite", { email: "o2@example.com", role: "owner" });
    const b = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.body.setupToken,
        password: PASSWORD, displayName: "Owner Two" });
    const tb = (await enableMfa(ctx.app, ctx.clock, { token: b.body.token,
      email: "o2@example.com" })).token;
    const ids: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const e = await call(ctx.app, ta, a.companyId, "POST",
        "/v1/employees", { number: `E-${i}`, fullName: `P${i}`,
          jobTitle: "C", nationality: "IN", workerClass: "expat-full-time",
          joiningDate: "2019-01-01" });
      ids.push(e.body.id);
      await call(ctx.app, ta, a.companyId, "PUT",
        `/v1/employees/${e.body.id}/salary`, salaryBody("4000.00"));
    }
    for (let m = 1; m <= 6; m++) {
      const run = await call(ctx.app, ta, a.companyId, "POST",
        "/v1/pay-runs", { period: { year: 2026, month: m }, entries: [] },
        { "idempotency-key": `m${m}` });
      const [ap] = await Promise.all([
        call(ctx.app, tb, a.companyId, "POST",
          `/v1/pay-runs/${run.body.id}/approve`),
        call(ctx.app, ta, a.companyId, "PUT",
          `/v1/employees/${ids[m - 1]}/salary`,
          salaryBody(`${4000 + m}.00`))]);
      if (ap!.status === 409) {
        expect(ap!.body.error.code).toBe("RUN_INPUTS_CHANGED");
        continue;
      }
      expect(ap!.status).toBe(200);
      // Approved: the salary write must have committed after it.
      const ev = await admin.query<{ action: string; seq: bigint }>(
        `SELECT action, seq FROM audit_events WHERE (action =
           'pay-run.approved' AND entity_id = $1) OR (action =
           'employee.salary.updated' AND entity_id = $2) ORDER BY seq
           DESC LIMIT 2`, [run.body.id, ids[m - 1]]);
      expect(ev.map((r) => r.action)).toEqual(
        ["employee.salary.updated", "pay-run.approved"]);
    }
  });

  it("20 parallel audit appends: seq 1 to 20, chain verifies", async () => {
    const { db, admin } = await open();
    await seedTwoBareCompanies(admin);
    const ctx = { companyId: COMPANY_A, userId: USER_A };
    await Promise.all(Array.from({ length: 20 }, (_, i) =>
      withTenant(db, ctx, (tx) => appendAudit(tx, { companyId: COMPANY_A,
        at: "2026-03-01T08:00:00.000Z", actorUserId: USER_A,
        action: "company.updated", entityType: "company",
        entityId: COMPANY_A, data: { count: i } }))));
    const v = await withTenant(db, ctx, (tx) => verifyChain(tx, COMPANY_A));
    expect(v).toEqual({ ok: true, checked: 20, firstBadSeq: null });
  });
}
