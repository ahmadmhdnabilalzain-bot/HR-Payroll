import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import type { AccessPort } from "../src/ports/access";
import { userOfEmployee } from "../src/onboarding/terms";
import { exitFixtures } from "./helpers/exit-fixtures";
import { seedCompany, type Seeded } from "./helpers/seed";
import { addMember } from "./helpers/seed-hr";
import {
  call,
  enableMfa,
  enrolOnly,
  makeApp,
  PASSWORD,
  signup,
} from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

let calls = 0;
let mode: "count" | "throw" = "count";
const port: AccessPort = { revoke: async () => {
  calls++;
  if (mode === "throw") throw new Error("directory down");
  return { status: "revoked" };
} };

let ctx: Ctx;
let s: Seeded;
let fx: ReturnType<typeof exitFixtures>;

const revoke = (exitId: string, token = s.hr.token) => call(ctx.app, token,
  s.companyId, "POST", `/v1/exits/${exitId}/revoke-access`, {});

const membership = (userId: string) => withTenant(ctx.deps.db,
  { companyId: s.companyId, userId: null }, (tx) => tx.query<{
    revoked_at: string | null; role: string }>(
    `SELECT revoked_at, role FROM memberships WHERE company_id = $1
     AND user_id = $2`, [s.companyId, userId]));

beforeAll(async () => {
  ctx = await makeApp({ access: port });
  s = await seedCompany(ctx, "revoke");
  fx = exitFixtures(ctx, s);
});

describe("access revocation", () => {
  it("revoked_session_gets_403_immediately", async () => {
    const { employeeId, user } = await fx.withLogin();
    const b = await signup(ctx.app, "secondco");
    const bOwner = await enableMfa(ctx.app, ctx.clock, b);
    const inv = await call(ctx.app, bOwner.token, b.companyId, "POST",
      "/v1/users/invite", { email: user.email, role: "employee" });
    const acc = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.body.setupToken,
        password: PASSWORD, displayName: "x" });
    expect(acc.status, acc.text).toBe(200);
    const x = await fx.approvedExit(employeeId);
    const before = await call(ctx.app, user.token, s.companyId, "GET",
      "/v1/me/payslips");
    expect(before.status).toBe(200);
    const r = await revoke(x.id);
    expect(r.status, r.text).toBe(200);
    expect(r.body.inApp).toBe("revoked");
    const a = await call(ctx.app, user.token, s.companyId, "GET",
      "/v1/me/payslips");
    expect(a.status).toBe(403);
    expect(a.body.error.code).toBe("TENANT_FORBIDDEN");
    const other = await call(ctx.app, user.token, b.companyId, "GET",
      "/v1/company");
    expect(other.status).toBe(200);
    const me = await call(ctx.app, user.token, null, "GET", "/v1/me");
    expect(me.body.memberships.map((m: { companyId: string }) =>
      m.companyId)).toEqual([b.companyId]);
    const g = await call(ctx.app, s.hr.token, s.companyId, "GET",
      `/v1/exits/${x.id}`);
    expect(g.body.access.status).toBe("revoked");
    const w = await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/exits/${x.id}/withdraw`);
    expect(w.body.error.code).toBe("EXIT_ACCESS_REVOKED");
  });

  it("revoke_needs_mfa", async () => {
    const hr2 = await addMember(ctx, s, "hr2.revoke@example.com", "hr");
    await enrolOnly(ctx.app, ctx.clock, hr2.token);
    const x = await fx.approvedExit(await fx.staff());
    const r = await revoke(x.id, hr2.token);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("MFA_REQUIRED");
  });

  it("revoke_last_owner_409", async () => {
    const lone = await seedCompany(ctx, "lone");
    const lfx = exitFixtures(ctx, lone);
    const id = await lfx.staff();
    await withTenant(ctx.deps.db, { companyId: lone.companyId,
      userId: null }, (tx) => tx.query(
      `UPDATE memberships SET employee_id = $2 WHERE company_id = $1
       AND user_id = $3`, [lone.companyId, id, lone.owner.userId]));
    const x = await lfx.approvedExit(id, "2026-03-01", lone.hr,
      lone.owner);
    const r = await call(ctx.app, lone.hr.token, lone.companyId, "POST",
      `/v1/exits/${x.id}/revoke-access`, {});
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("LAST_OWNER");
    const [m] = await withTenant(ctx.deps.db, { companyId: lone.companyId,
      userId: null }, (tx) => tx.query<{ revoked_at: string | null }>(
      "SELECT revoked_at FROM memberships WHERE user_id = $1",
      [lone.owner.userId]));
    expect(m!.revoked_at).toBeNull();
  });

  it("revoke_no_login_reports_no_login", async () => {
    const x = await fx.approvedExit(await fx.staff());
    const r = await revoke(x.id);
    expect(r.status, r.text).toBe(200);
    expect(r.body.inApp).toBe("no-login");
  });

  it("revoke_idempotent_no_second_port_call", async () => {
    const { employeeId } = await fx.withLogin();
    const x = await fx.approvedExit(employeeId);
    calls = 0;
    const a = await revoke(x.id);
    ctx.clock.advance(60_000);
    const b = await revoke(x.id);
    expect(calls).toBe(1);
    expect(a.body.external).toBe("revoked");
    expect(b.body).toEqual(a.body);
    expect(a.body.beforeLastDay).toBe(true);
  });

  it("access_port_throw_recorded_failed", async () => {
    const { employeeId, user } = await fx.withLogin();
    const x = await fx.approvedExit(employeeId);
    mode = "throw";
    try {
      const r = await revoke(x.id);
      expect(r.status, r.text).toBe(200);
      expect(r.body.external).toBe("failed");
      expect(r.body.inApp).toBe("revoked");
    } finally {
      mode = "count";
    }
    const [m] = await membership(user.userId);
    expect(m!.revoked_at).not.toBeNull();
  });

  it("me_hides_revoked_membership", async () => {
    const { employeeId, user } = await fx.withLogin();
    await revoke((await fx.approvedExit(employeeId)).id);
    const me = await call(ctx.app, user.token, null, "GET", "/v1/me");
    expect(me.body.memberships).toEqual([]);
    const users = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/users");
    expect(users.body.items.map((u: { userId: string }) => u.userId))
      .not.toContain(user.userId);
  });

  it("rehire_invite_restores_membership", async () => {
    const { employeeId, user } = await fx.withLogin();
    await revoke((await fx.approvedExit(employeeId)).id);
    const inv = await call(ctx.app, s.owner.token, s.companyId, "POST",
      "/v1/users/invite", { email: user.email, role: "employee",
        employeeId });
    const acc = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.body.setupToken,
        password: PASSWORD, displayName: "back" });
    expect(acc.status, acc.text).toBe(200);
    const r = await call(ctx.app, acc.body.token, s.companyId, "GET",
      "/v1/me/payslips");
    expect(r.status).toBe(200);
    const [m] = await membership(user.userId);
    expect(m!.revoked_at).toBeNull();
  });

  it("old_invite_cannot_restore_after_revoke", async () => {
    const { employeeId, user } = await fx.withLogin();
    const spare = await call(ctx.app, s.owner.token, s.companyId, "POST",
      "/v1/users/invite", { email: user.email, role: "hr" });
    const linked = await call(ctx.app, s.owner.token, s.companyId, "POST",
      "/v1/users/invite", { email: "someone.else@example.com",
        role: "employee", employeeId });
    // Plan 3's one-user-per-employee rule refuses this second link.
    expect(linked.body.error.code).toBe("EMPLOYEE_ALREADY_LINKED");
    await revoke((await fx.approvedExit(employeeId)).id);
    for (const inv of [spare]) {
      const acc = await call(ctx.app, null, null, "POST",
        "/v1/auth/accept-invite", { setupToken: inv.body.setupToken,
          password: PASSWORD, displayName: "late" });
      expect(acc.status, acc.text).toBe(410);
      expect(acc.body.error.code).toBe("INVITE_USED");
    }
    const r = await call(ctx.app, user.token, s.companyId, "GET",
      "/v1/company");
    expect(r.status).toBe(403);
  });

  it("revoked_login_not_task_assignee", async () => {
    const { employeeId, user } = await fx.withLogin();
    await revoke((await fx.approvedExit(employeeId)).id);
    const who = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => userOfEmployee(tx, s.companyId, employeeId));
    expect(who).toBeNull();
    expect(user.userId).toBeDefined();
  });

  it("my_companies_policy_ignores_revoked", async () => {
    const { employeeId, user } = await fx.withLogin();
    await revoke((await fx.approvedExit(employeeId)).id);
    const rows = await withTenant(ctx.deps.db, { companyId: null,
      userId: user.userId }, async (tx) => [
      ...await tx.query("SELECT id FROM companies"),
      ...await tx.query("SELECT company_id FROM memberships")]);
    expect(rows).toEqual([]);
  });

  it("revoked_member_not_assignable", async () => {
    const { employeeId, user } = await fx.withLogin();
    await revoke((await fx.approvedExit(employeeId)).id);
    const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/tasks", { title: "x", assigneeUserId: user.userId });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("ASSIGNEE_NOT_MEMBER");
  });
});
