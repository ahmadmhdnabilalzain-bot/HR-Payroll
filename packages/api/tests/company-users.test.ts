import { beforeEach, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import {
  call,
  enableMfa,
  login,
  makeApp,
  PASSWORD,
  signup,
  type Account,
} from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

async function invite(ctx: Ctx, a: Account, email: string, role: string) {
  const r = await call(ctx.app, a.token, a.companyId, "POST",
    "/v1/users/invite", { email, role });
  expect(r.status, r.text).toBe(201);
  return r.body.setupToken as string;
}

const accept = (ctx: Ctx, setupToken: string, password = PASSWORD) =>
  call(ctx.app, null, null, "POST", "/v1/auth/accept-invite",
    { setupToken, password, displayName: "New Person" });

describe("company and users", () => {
  let ctx: Ctx;
  let a: Account;
  beforeEach(async () => {
    ctx = await makeApp();
    a = await signup(ctx.app, "acme");
  });

  it("owner sets WPS settings and the change is audited", async () => {
    const wps = { employerId: "0000000123456", bankRoutingCode: "802420101" };
    const p = await call(ctx.app, a.token, a.companyId, "PATCH",
      "/v1/company", { wps });
    expect(p.status, p.text).toBe(200);
    const g = await call(ctx.app, a.token, a.companyId, "GET",
      "/v1/company");
    expect(g.body.wps).toEqual(wps);
    expect(g.body.name).toBe("acme Trading LLC");
    const events = await withTenant(ctx.deps.db, { companyId: a.companyId,
      userId: null }, (tx) => tx.query<{ action: string; data: unknown }>(
      "SELECT action, data FROM audit_events ORDER BY seq"));
    expect(events.map((e) => e.action)).toEqual(["company.created",
      "company.updated"]);
    expect(events[1]?.data).toEqual({ changed: ["wps"] });
  });

  it("an invited hr user joins with role hr; reuse is refused", async () => {
    const token = await invite(ctx, a, "hr@example.com", "hr");
    expect(token.startsWith(`${a.companyId}.`)).toBe(true);
    const r = await accept(ctx, token);
    expect(r.status, r.text).toBe(200);
    expect(r.body.memberships).toEqual([{ companyId: a.companyId,
      companyName: "acme Trading LLC", role: "hr", employeeId: null }]);
    const again = await accept(ctx, token);
    expect(again.status).toBe(410);
    expect(again.body.error.code).toBe("INVITE_USED");
    const hrLogin = await login(ctx.app, "hr@example.com", PASSWORD);
    expect(hrLogin.status).toBe(200);
    const users = await call(ctx.app, hrLogin.body.token, a.companyId,
      "GET", "/v1/users");
    expect(users.status).toBe(403);
    expect(users.body.error.code).toBe("FORBIDDEN");
  });

  it("the owner lists users", async () => {
    await accept(ctx, await invite(ctx, a, "hr@example.com", "hr"));
    const r = await call(ctx.app, a.token, a.companyId, "GET", "/v1/users");
    expect(r.status).toBe(200);
    expect(r.body.items.map((u: { role: string }) => u.role).sort())
      .toEqual(["hr", "owner"]);
  });

  it("an existing user accepts with their own password", async () => {
    const b = await signup(ctx.app, "beta");
    const token = await invite(ctx, a, b.email, "manager");
    const bad = await accept(ctx, token, "not the password!");
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS");
    const ok = await accept(ctx, token);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.memberships.length).toBe(2);
  });

  it("accept-invite password guesses count toward lockout", async () => {
    const b = await signup(ctx.app, "beta");
    const token = await invite(ctx, a, b.email, "employee");
    for (let i = 0; i < 5; i++) {
      const r = await accept(ctx, token, "not the password!");
      expect(r.body.error.code).toBe("INVALID_CREDENTIALS");
    }
    const locked = await accept(ctx, token);
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
    expect((await login(ctx.app, b.email, PASSWORD)).status).toBe(423);
  });

  it("the owner changes a role with MFA; the last owner stays", async () => {
    const hr = await accept(ctx, await invite(ctx, a, "hr@example.com",
      "hr"));
    const hrId = hr.body.user.id as string;
    const path = `/v1/users/${hrId}`;
    const noMfa = await call(ctx.app, a.token, a.companyId, "PATCH", path,
      { role: "manager" });
    expect(noMfa.body.error.code).toBe("MFA_ENROLMENT_REQUIRED");
    const mfa = await enableMfa(ctx.app, ctx.clock, a);
    a = { ...a, token: mfa.token };
    const ok = await call(ctx.app, a.token, a.companyId, "PATCH", path,
      { role: "manager" });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.role).toBe("manager");
    const last = await call(ctx.app, a.token, a.companyId, "PATCH",
      `/v1/users/${a.userId}`, { role: "hr" });
    expect(last.status).toBe(409);
    expect(last.body.error.code).toBe("LAST_OWNER");
    const missing = await call(ctx.app, a.token, a.companyId, "PATCH",
      "/v1/users/00000000-0000-4000-8000-00000000dead", { role: "hr" });
    expect(missing.status).toBe(404);
    const events = await withTenant(ctx.deps.db, { companyId: a.companyId,
      userId: null }, (tx) => tx.query<{ action: string; data: unknown }>(
      "SELECT action, data FROM audit_events WHERE action = " +
      "'user.role-changed'"));
    expect(events).toEqual([{ action: "user.role-changed",
      data: { from: "hr", to: "manager" } }]);
  });

  it("an expired or unknown invite is refused", async () => {
    const token = await invite(ctx, a, "late@example.com", "employee");
    ctx.clock.advance(72 * 3600 * 1000 + 1000);
    expect((await accept(ctx, token)).body.error.code)
      .toBe("INVITE_EXPIRED");
    expect((await accept(ctx, `${a.companyId}.nope`)).body.error.code)
      .toBe("INVITE_NOT_FOUND");
    expect((await accept(ctx, "garbage")).body.error.code)
      .toBe("INVITE_INVALID");
  });
});
