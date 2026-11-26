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
    expect(statuses(rs)).toEqual([200, 409]);
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
