import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/audit/canonical";
import { withTenant } from "../src/db/tenant";
import { fakeChannels } from "./helpers/fake-channels";
import type { FakeOidc } from "./helpers/fake-oidc";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, enableMfa, makeApp, signup } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const TID = "11111111-1111-4111-8111-111111111111";
const oidcOf = (ctx: Ctx) => ctx.deps.channels.oidc as FakeOidc;
let n = 0;

/** Start (or link-start), sign the token with the sent nonce, call back. */
async function sso(ctx: Ctx, p: "google" | "microsoft",
  claims: Record<string, unknown>, o: { start?: Record<string, unknown>;
    link?: string; bearer?: string | null; totp?: string } = {}) {
  const start = o.link !== undefined
    ? await call(ctx.app, o.link, null, "POST",
      `/v1/me/sso-identities/${p}/link`)
    : await call(ctx.app, null, null, "POST", `/v1/auth/sso/${p}/start`,
      o.start ?? { intent: "login" });
  if (start.status !== 200) return start;
  const s = oidcOf(ctx).starts.at(-1)!;
  const now = Math.floor(ctx.clock.now.getTime() / 1000);
  const iss = p === "google" ? "https://accounts.google.com"
    : `https://login.microsoftonline.com/${claims.tid}/v2.0`;
  const code = `code-${n++}`;
  oidcOf(ctx).codes.set(code, oidcOf(ctx).issuer.idToken({ iss,
    aud: `client-${p}`, nonce: s.nonce, exp: now + 600, iat: now,
    ...claims }));
  const bearer = o.bearer === undefined ? o.link ?? null : o.bearer;
  return call(ctx.app, bearer, null, "POST", `/v1/auth/sso/${p}/callback`,
    { code, state: s.state, ...(o.totp ? { totp: o.totp } : {}) });
}

const google = (sub: string, email: string) => ({ sub, email,
  email_verified: true, hd: "acme.test" });

async function setSso(ctx: Ctx, s: Seeded, over = {}) {
  const cur = await call(ctx.app, s.owner.token, s.companyId, "GET",
    "/v1/sso-settings");
  const r = await call(ctx.app, s.owner.token, s.companyId, "PUT",
    "/v1/sso-settings", { allowedDomains: ["acme.test"],
      googleHostedDomains: ["acme.test"], microsoftTenantIds: [],
      jitEmployees: true, enforceSso: false, ...over,
      expectedVersion: cur.body.version });
  if (r.status !== 200) throw new Error(r.text);
}

const db = (ctx: Ctx, sql: string, args: unknown[] = []) =>
  withTenant(ctx.deps.db, { companyId: null, userId: null },
    (tx) => tx.query<Record<string, unknown>>(sql, args));

describe("SSO with OpenID Connect", () => {
  it("sso_login_linked", async () => {
    const ctx = await makeApp();
    const a = await signup(ctx.app, "ssoa");
    const m = await enableMfa(ctx.app, ctx.clock, a);
    const linked = await sso(ctx, "google", google("g-1", a.email),
      { link: m.token });
    expect(linked.status, linked.text).toBe(200);
    const notes = await call(ctx.app, m.token, a.companyId, "GET",
      "/v1/me/notifications");
    expect(notes.body.items.map((x: { kind: string }) => x.kind))
      .toContain("security-sso-linked");
    const r = await sso(ctx, "google", google("g-1", a.email));
    expect(r.status, r.text).toBe(200);
    const [row] = await db(ctx, "SELECT auth_method, mfa FROM sessions " +
      "WHERE token_hash = $1", [sha256Hex(r.body.token)]);
    expect(row).toEqual({ auth_method: "sso:google", mfa: false });
    ctx.clock.advance(30_000);
    const withCode = await sso(ctx, "google", google("g-1", a.email),
      { totp: m.code() });
    await db(ctx, "UPDATE users SET locked_until = $2 WHERE id = $1",
      [a.userId, "2099-01-01T00:00:00.000Z"]);
    const locked = await sso(ctx, "google", google("g-1", a.email));
    expect(locked.body.error.code).toBe("SSO_NOT_LINKED");
    const [r2] = await db(ctx, "SELECT mfa FROM sessions WHERE " +
      "token_hash = $1", [sha256Hex(withCode.body.token)]);
    expect(r2!.mfa).toBe(true);
  });

  it("sso_unlinked_owner_email_refused (Review Focus 2)", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "ssob");
    await setSso(ctx, s);
    await db(ctx, "UPDATE users SET email = 'o@acme.test' WHERE id = $1",
      [s.owner.userId]);
    const before = await db(ctx, "SELECT count(*)::int AS n FROM sessions");
    const g = await sso(ctx, "google", google("g-o", "o@acme.test"));
    expect(g.status).toBe(401);
    expect(g.body.error.code).toBe("SSO_NOT_LINKED");
    const ms = await sso(ctx, "microsoft", { tid: TID,
      oid: "33333333-3333-4333-8333-333333333333", email: "o@acme.test" });
    expect(ms.body.error.code).toBe("SSO_NOT_LINKED");
    expect(await db(ctx, "SELECT * FROM sso_identities")).toEqual([]);
    expect(await db(ctx, "SELECT count(*)::int AS n FROM sessions"))
      .toEqual(before);
    const mem = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => tx.query("SELECT role FROM memberships " +
      "WHERE user_id = $1", [s.owner.userId]));
    expect(mem).toEqual([{ role: "owner" }]);
  });

  it("sso_jit_employee_only", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "ssoc");
    await call(ctx.app, s.hr.token, s.companyId, "PATCH",
      `/v1/employees/${s.emp.outsider}`, { email: "e@acme.test",
        jobTitle: "HR manager" });
    const off = await sso(ctx, "google", google("g-e", "e@acme.test"));
    expect(off.status).toBe(401);
    await setSso(ctx, s);
    const r = await sso(ctx, "google", google("g-e", "e@acme.test"));
    expect(r.status, r.text).toBe(200);
    expect(r.body.memberships).toEqual([expect.objectContaining({
      companyId: s.companyId, role: "employee" })]);
    const [u] = await db(ctx, "SELECT password_hash FROM users WHERE id = $1",
      [r.body.user.id]);
    expect(u!.password_hash).toBeNull();
    const last = await call(ctx.app, r.body.token, null, "GET",
      "/v1/me/sso-identities");
    const un = await call(ctx.app, r.body.token, null, "POST",
      `/v1/me/sso-identities/${last.body.items[0].id}/unlink`);
    expect(un.status).toBe(409);
    expect(un.body.error.code).toBe("LAST_SIGN_IN_METHOD");
  });

  it("sso_state_rules and sso_link_bound_to_session", async () => {
    const ctx = await makeApp();
    const a = await signup(ctx.app, "ssod");
    const b = await signup(ctx.app, "ssoe");
    await call(ctx.app, null, null, "POST", "/v1/auth/sso/google/start",
      { intent: "login" });
    const st = oidcOf(ctx).starts.at(-1)!;
    const cb = (p: string) => call(ctx.app, null, null, "POST",
      `/v1/auth/sso/${p}/callback`, { code: "x", state: st.state });
    expect((await cb("microsoft")).body.error.code).toBe("SSO_STATE_INVALID");
    ctx.clock.advance(11 * 60_000);
    expect((await cb("google")).body.error.code).toBe("SSO_STATE_INVALID");
    for (const bearer of [null, b.token]) {
      const r = await sso(ctx, "google", google("g-x", a.email),
        { link: a.token, bearer });
      expect(r.body.error.code).toBe("SSO_STATE_INVALID");
    }
    expect(await db(ctx, "SELECT * FROM sso_identities")).toEqual([]);
    const ok = await sso(ctx, "google", google("g-x", a.email),
      { link: a.token });
    expect(ok.status).toBe(200);
    const again = await sso(ctx, "google", google("g-x", a.email),
      { link: b.token });
    expect(again.body.error.code).toBe("SSO_IDENTITY_IN_USE");
  });

  it("sso_invite and sso_enforced", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "ssof");
    const inv = await call(ctx.app, s.owner.token, s.companyId, "POST",
      "/v1/users/invite", { email: "h@acme.test", role: "hr" });
    const bad = await sso(ctx, "google", google("g-h", "x@acme.test"),
      { start: { intent: "invite", inviteToken: inv.body.setupToken } });
    expect(bad.body.error.code).toBe("INVITE_EMAIL_MISMATCH");
    const ok = await sso(ctx, "google", google("g-h", "h@acme.test"),
      { start: { intent: "invite", inviteToken: inv.body.setupToken } });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.memberships[0].role).toBe("hr");
    await setSso(ctx, s, { jitEmployees: false, enforceSso: true });
    const pw = await call(ctx.app, s.hr.token, s.companyId, "GET",
      "/v1/employees");
    expect(pw.body.error.code).toBe("SSO_REQUIRED");
    expect((await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/employees")).status).toBe(200);
    expect((await call(ctx.app, ok.body.token, s.companyId, "GET",
      "/v1/employees")).status).toBe(200);
  });

  it("sso_not_configured and settings need owner MFA", async () => {
    const ctx = await makeApp({ channels: fakeChannels({ oidc: false }) });
    const r = await call(ctx.app, null, null, "POST",
      "/v1/auth/sso/google/start", { intent: "login" });
    expect(r.body.error.code).toBe("SSO_NOT_CONFIGURED");
    const s = await seedCompany(ctx, "ssog");
    const put = await call(ctx.app, s.hr.token, s.companyId, "PUT",
      "/v1/sso-settings", { allowedDomains: [], googleHostedDomains: [],
        microsoftTenantIds: [], jitEmployees: false, enforceSso: false,
        expectedVersion: 0 });
    expect(put.status).toBe(403);
  });
});
