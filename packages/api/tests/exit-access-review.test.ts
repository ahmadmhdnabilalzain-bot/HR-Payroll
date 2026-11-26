import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { exitFixtures } from "./helpers/exit-fixtures";
import { seedCompany, type Seeded } from "./helpers/seed";
import { addMember } from "./helpers/seed-hr";
import { call, makeApp, PASSWORD } from "./helpers/test-app";

/** Plan 8 review C-1, I-1, I-3 (who and what revocation reaches). */
type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let fx: ReturnType<typeof exitFixtures>;
let n = 0;
const BACK = "2026-01-15";

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "accrev");
  fx = exitFixtures(ctx, s);
});

/** A staff member and an unlinked login with the same email. */
async function unlinked(role: string) {
  const email = `same${n++}@example.com`;
  const employeeId = await fx.staff(email);
  const user = await addMember(ctx, s, email, role);
  return { employeeId, user };
}

async function readyToClose(employeeId: string) {
  const x = await fx.approvedExit(employeeId, BACK);
  await fx.clearTasks(x.id);
  await fx.settle(x.id);
  return x;
}

const close = (id: string) => fx.by(s.hr, "POST", `/v1/exits/${id}/close`);

describe("logins matched by email (C-1)", () => {
  it("close_refused_while_matching_login_active", async () => {
    const { employeeId, user } = await unlinked("hr");
    const x = await readyToClose(employeeId);
    const g = await fx.must(fx.by(s.hr, "GET", `/v1/exits/${x.id}`));
    expect(g.access.status).toBe("not-revoked");
    expect(g.access.logins).toEqual([{ userId: user.userId, role: "hr",
      match: "email", active: true, confirmedOther: false }]);
    const early = await close(x.id);
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe("ACCESS_NOT_REVOKED");
    const r = await fx.revoke(x.id);
    expect(r.status, r.text).toBe(200);
    expect(r.body.inApp).toBe("revoked");
    const gone = await call(ctx.app, user.token, s.companyId, "GET",
      "/v1/employees");
    expect(gone.status).toBe(403);
    expect((await close(x.id)).status).toBe(200);
  });

  it("hr_confirms_login_is_someone_else", async () => {
    const { employeeId, user } = await unlinked("employee");
    const x = await readyToClose(employeeId);
    const r = await fx.revoke(x.id, s.hr, [user.userId]);
    expect(r.status, r.text).toBe(200);
    expect(r.body.inApp).toBe("no-login");
    const still = await call(ctx.app, user.token, s.companyId, "GET",
      "/v1/company");
    expect(still.status).toBe(200);
    const c = await close(x.id);
    expect(c.status, c.text).toBe(200);
    expect(c.body.access.logins[0].confirmedOther).toBe(true);
  });

  it("not_the_leaver_must_be_a_listed_login", async () => {
    const x = await fx.approvedExit(await fx.staff());
    const r = await fx.revoke(x.id, s.owner, [s.hr.userId]);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("unlinked_owner_revoke_hits_last_owner", async () => {
    const lone = await seedCompany(ctx, "loneacc");
    const lfx = exitFixtures(ctx, lone);
    const id = await lfx.staff(lone.owner.email);
    const x = await lfx.approvedExit(id, BACK, lone.hr, lone.owner);
    const r = await lfx.revoke(x.id, lone.hr);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("LAST_OWNER");
  });

  it("owner_links_a_login_to_an_employee", async () => {
    const id = await fx.staff();
    const u = await addMember(ctx, s, `link${n++}@example.com`, "hr");
    const r = await fx.by(s.owner, "PATCH", `/v1/users/${u.userId}/employee`,
      { employeeId: id });
    expect(r.status, r.text).toBe(200);
    expect(r.body.employeeId).toBe(id);
    const v = await fx.by(s.owner, "PATCH",
      `/v1/users/${s.hr.userId}/employee`, { employeeId: id });
    expect(v.body.error.code).toBe("EMPLOYEE_ALREADY_LINKED");
    const h = await fx.by(s.hr, "PATCH", `/v1/users/${u.userId}/employee`,
      { employeeId: null });
    expect(h.status).toBe(403);
  });
});

describe("close needs a revocation run (I-1)", () => {
  it("close_requires_access_run_even_no_login", async () => {
    const x = await readyToClose(await fx.staff());
    const c = await close(x.id);
    expect(c.status).toBe(409);
    expect(c.body.error.code).toBe("ACCESS_NOT_REVOKED");
    await fx.must(fx.revoke(x.id, s.hr));
    expect((await close(x.id)).status).toBe(200);
  });

  it("close_rechecks_live_logins_after_revoke", async () => {
    const { employeeId, user } = await fx.withLogin();
    const x = await readyToClose(employeeId);
    await fx.must(fx.revoke(x.id, s.hr));
    const inv = await fx.must(fx.by(s.owner, "POST", "/v1/users/invite",
      { email: user.email, role: "employee", employeeId }), 201);
    await call(ctx.app, null, null, "POST", "/v1/auth/accept-invite",
      { setupToken: inv.setupToken, password: PASSWORD, displayName: "x" });
    const c = await close(x.id);
    expect(c.status).toBe(409);
    expect(c.body.error.code).toBe("ACCESS_NOT_REVOKED");
  });

  it("invite_refused_after_closed_exit", async () => {
    const { employeeId, user } = await fx.withLogin();
    const email = `other${n++}@example.com`;
    const inv = await fx.must(fx.by(s.owner, "POST", "/v1/users/invite",
      { email, role: "employee" }), 201);
    const x = await readyToClose(employeeId);
    await fx.must(fx.revoke(x.id, s.hr));
    await fx.must(close(x.id));
    // An invite issued before the exit, re-pointed at the employee.
    await withTenant(ctx.deps.db, { companyId: s.companyId, userId: null },
      (tx) => tx.query(
        `UPDATE invites SET employee_id = $3 WHERE company_id = $1
         AND email = $2`, [s.companyId, email, employeeId]));
    const acc = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.setupToken,
        password: PASSWORD, displayName: "late" });
    expect(acc.status, acc.text).toBe(410);
    expect(user.userId).toBeDefined();
  });
});

describe("owners decide on owner and hr revocations (I-3)", () => {
  it("hr_cannot_revoke_an_hr_login", async () => {
    const id = await fx.staff();
    const u = await addMember(ctx, s, `hrl${n++}@example.com`, "hr", id);
    const x = await fx.approvedExit(id);
    const r = await fx.revoke(x.id, s.hr);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
    expect((await fx.revoke(x.id, s.owner)).status).toBe(200);
    expect(u.userId).toBeDefined();
  });
});
