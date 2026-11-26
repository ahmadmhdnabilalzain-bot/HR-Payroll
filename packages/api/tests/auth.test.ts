import { beforeEach, describe, expect, it } from "vitest";
import { ApiErrorBody, ERROR_CODES } from "@payroll/contract";
import {
  call,
  enrolOnly,
  login,
  makeApp,
  PASSWORD,
  signup,
  type Clock,
  type Res,
} from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

function expectError(r: Res, status: number, code: string): void {
  expect(r.status, r.text).toBe(status);
  expect(ApiErrorBody.parse(r.body).error.code).toBe(code);
  expect(ERROR_CODES).toContain(code);
  expect(r.body.error.requestId).toBe(r.headers.get("x-request-id"));
}

const enrolMfa = (ctx: Ctx, token: string, clock: Clock) =>
  enrolOnly(ctx.app, clock, token);

describe("auth", () => {
  let ctx: Ctx;
  beforeEach(async () => {
    ctx = await makeApp();
  });

  it("auth_signup_then_me", async () => {
    const a = await signup(ctx.app, "acme");
    const r = await call(ctx.app, a.token, null, "GET", "/v1/me");
    expect(r.status).toBe(200);
    expect(r.body.memberships).toEqual([{ companyId: a.companyId,
      companyName: "acme Trading LLC", role: "owner", employeeId: null }]);
    expect(r.body.session.mfa).toBe(false);
    expect(r.headers.get("x-request-id")).toBeTruthy();
    const dup = await call(ctx.app, null, null, "POST", "/v1/signup", {
      companyName: "Other", email: "ACME@example.com", password: PASSWORD,
      displayName: "X" });
    expectError(dup, 409, "EMAIL_TAKEN");
  });

  it("auth_login_same_error_for_unknown_and_wrong", async () => {
    const a = await signup(ctx.app, "acme");
    const unknown = await login(ctx.app, "nobody@example.com", PASSWORD);
    const wrong = await login(ctx.app, a.email, "wrong password!!");
    expectError(unknown, 401, "INVALID_CREDENTIALS");
    expectError(wrong, 401, "INVALID_CREDENTIALS");
    const strip = (r: Res) => ({ ...r.body.error, requestId: "" });
    expect(strip(unknown)).toEqual(strip(wrong));
    const ok = await login(ctx.app, a.email, PASSWORD);
    expect(ok.status).toBe(200);
  });

  it("auth_lockout_after_5", async () => {
    const a = await signup(ctx.app, "acme");
    for (let i = 0; i < 5; i++) {
      expectError(await login(ctx.app, a.email, "wrong password!!"), 401,
        "INVALID_CREDENTIALS");
    }
    expectError(await login(ctx.app, a.email, PASSWORD), 423,
      "ACCOUNT_LOCKED");
    ctx.clock.advance(15 * 60 * 1000 + 1000);
    expect((await login(ctx.app, a.email, PASSWORD)).status).toBe(200);
  });

  it("auth_logout_kills_token", async () => {
    const a = await signup(ctx.app, "acme");
    const out = await call(ctx.app, a.token, null, "POST", "/v1/auth/logout");
    expect(out.status).toBe(204);
    expectError(await call(ctx.app, a.token, null, "GET", "/v1/me"), 401,
      "UNAUTHENTICATED");
  });

  it("auth_expired_session", async () => {
    const a = await signup(ctx.app, "acme");
    ctx.clock.advance(8 * 3600 * 1000 - 1000);
    expect((await call(ctx.app, a.token, null, "GET", "/v1/me")).status)
      .toBe(200);
    ctx.clock.advance(2000);
    expectError(await call(ctx.app, a.token, null, "GET", "/v1/me"), 401,
      "UNAUTHENTICATED");
    expectError(await call(ctx.app, null, null, "GET", "/v1/me"), 401,
      "UNAUTHENTICATED");
  });

  it("auth_missing_company_header", async () => {
    const a = await signup(ctx.app, "acme");
    expectError(await call(ctx.app, a.token, null, "GET", "/v1/company"),
      400, "COMPANY_HEADER_REQUIRED");
    expectError(await call(ctx.app, a.token, "not-a-uuid", "GET",
      "/v1/company"), 400, "VALIDATION_FAILED");
  });

  it("auth_other_company_forbidden", async () => {
    const a = await signup(ctx.app, "acme");
    const b = await signup(ctx.app, "beta");
    expectError(await call(ctx.app, a.token, b.companyId, "GET",
      "/v1/company"), 403, "TENANT_FORBIDDEN");
  });

  it("auth_mfa_enrol_confirm_then_login_with_totp", async () => {
    const a = await signup(ctx.app, "acme");
    const code = await enrolMfa(ctx, a.token, ctx.clock);
    const me0 = await call(ctx.app, a.token, null, "GET", "/v1/me");
    expect(me0.body.session.mfa).toBe(false);
    const again = await call(ctx.app, a.token, null, "POST",
      "/v1/auth/mfa/enrol", { password: PASSWORD });
    expectError(again, 409, "MFA_ALREADY_ENROLLED");
    ctx.clock.advance(60_000);
    const plain = await login(ctx.app, a.email, PASSWORD);
    expect(plain.status).toBe(200);
    const me1 = await call(ctx.app, plain.body.token, null, "GET", "/v1/me");
    expect(me1.body.session.mfa).toBe(false);
    expect(me1.body.user.mfaEnrolled).toBe(true);
    expectError(await login(ctx.app, a.email, PASSWORD, "000000"), 401,
      "INVALID_CREDENTIALS");
    const withCode = await login(ctx.app, a.email, PASSWORD, code());
    expect(withCode.status, withCode.text).toBe(200);
    const me2 = await call(ctx.app, withCode.body.token, null, "GET",
      "/v1/me");
    expect(me2.body.session.mfa).toBe(true);
  });

  it("auth_totp_code_is_single_use", async () => {
    const a = await signup(ctx.app, "acme");
    const code = await enrolMfa(ctx, a.token, ctx.clock);
    // The confirm code's step is used: the same code cannot sign in.
    expectError(await login(ctx.app, a.email, PASSWORD, code()), 401,
      "INVALID_CREDENTIALS");
    ctx.clock.advance(30_000);
    const first = code();
    expect((await login(ctx.app, a.email, PASSWORD, first)).status)
      .toBe(200);
    expectError(await login(ctx.app, a.email, PASSWORD, first), 401,
      "INVALID_CREDENTIALS");
    ctx.clock.advance(30_000);
    expect((await login(ctx.app, a.email, PASSWORD, code())).status)
      .toBe(200);
  });

  it("auth_mfa_confirm_rejects_a_wrong_code", async () => {
    const a = await signup(ctx.app, "acme");
    const body = { code: "123456", password: PASSWORD };
    expectError(await call(ctx.app, a.token, null, "POST",
      "/v1/auth/mfa/confirm", body), 409, "MFA_NOT_STARTED");
    await call(ctx.app, a.token, null, "POST", "/v1/auth/mfa/enrol",
      { password: PASSWORD });
    expectError(await call(ctx.app, a.token, null, "POST",
      "/v1/auth/mfa/confirm", { ...body, code: "000000" }), 400,
      "MFA_CODE_INVALID");
  });

  it("auth_mfa_needs_the_password_and_revokes_other_sessions", async () => {
    const a = await signup(ctx.app, "acme");
    const other = await login(ctx.app, a.email, PASSWORD);
    expectError(await call(ctx.app, a.token, null, "POST",
      "/v1/auth/mfa/enrol", { password: "stolen token only" }), 401,
      "INVALID_CREDENTIALS");
    expect((await call(ctx.app, other.body.token, null, "GET", "/v1/me"))
      .status).toBe(200);
    await enrolOnly(ctx.app, ctx.clock, a.token);
    expectError(await call(ctx.app, other.body.token, null, "GET",
      "/v1/me"), 401, "UNAUTHENTICATED");
    const me = await call(ctx.app, a.token, null, "GET", "/v1/me");
    expect(me.body.session.mfa).toBe(false);
  });

  it("auth_mfa_password_guesses_count_toward_lockout", async () => {
    const a = await signup(ctx.app, "acme");
    for (let i = 0; i < 5; i++) {
      await call(ctx.app, a.token, null, "POST", "/v1/auth/mfa/enrol",
        { password: "wrong password!!" });
    }
    expectError(await call(ctx.app, a.token, null, "POST",
      "/v1/auth/mfa/enrol", { password: PASSWORD }), 423, "ACCOUNT_LOCKED");
  });

  it("auth_role_forbidden", async () => {
    const a = await signup(ctx.app, "acme");
    const inv = await call(ctx.app, a.token, a.companyId, "POST",
      "/v1/users/invite", { email: "emp@example.com", role: "employee" });
    const acc = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.body.setupToken,
        password: PASSWORD, displayName: "Emp" });
    expect(acc.status, acc.text).toBe(200);
    expectError(await call(ctx.app, acc.body.token, a.companyId, "PATCH",
      "/v1/company", { name: "Mine now" }), 403, "FORBIDDEN");
  });

  it("auth_validation_error_has_paths_not_values", async () => {
    const secret = "my-very-secret-password-123";
    const r = await call(ctx.app, null, null, "POST", "/v1/signup", {
      companyName: "Acme", email: "not-an-email", password: secret,
      displayName: "X" });
    expectError(r, 400, "VALIDATION_FAILED");
    expect(r.text).not.toContain(secret);
    expect(r.text).not.toContain("not-an-email");
    expect(r.body.error.detail.fields).toContain("body.email");
  });

  it("auth_log_has_no_body", async () => {
    const a = await signup(ctx.app, "acme");
    await login(ctx.app, a.email, "wrong password!!");
    const text = JSON.stringify(ctx.logs);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain("wrong password!!");
    const line = ctx.logs.find((l) => l.routeId === "login");
    expect(Object.keys(line ?? {}).sort()).toEqual(["companyId", "method",
      "ms", "requestId", "routeId", "status", "userId"]);
    expect(line?.status).toBe(401);
  });

  it("a body over 1 MiB is refused with 413", async () => {
    const r = await call(ctx.app, null, null, "POST", "/v1/auth/login",
      { email: "a@example.com", password: "x".repeat(1_100_000) });
    expectError(r, 413, "PAYLOAD_TOO_LARGE");
  });

  it("unknown route is a 404 with an error body", async () => {
    expectError(await call(ctx.app, null, null, "GET", "/v1/nope"), 404,
      "NOT_FOUND");
    const h = await call(ctx.app, null, null, "GET", "/v1/health");
    expect(h.body).toEqual({ status: "ok" });
  });
});
