import { describe, expect, it } from "vitest";
import {
  formatApiKey,
  hashKeySecret,
  parseApiKey,
} from "../src/apikeys/format";
import { rowsOf } from "./helpers/channel-jobs";
import { SENTINELS, seedCompany, type Seeded } from "./helpers/seed";
import { call, login, makeApp, PASSWORD } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const ALL = ["employees:read", "employees:write", "leave:read",
  "leave:write", "attendance:read", "payroll:read", "expenses:read"];

async function newKey(ctx: Ctx, s: Seeded, scopes = ALL, extra = {}) {
  const r = await call(ctx.app, s.owner.token, s.companyId, "POST",
    "/v1/api-keys", { name: "Sync", scopes, ...extra });
  if (r.status !== 201) throw new Error(r.text);
  return r.body as { key: { id: string }; secret: string };
}
const asKey = (ctx: Ctx, key: string, c: string, m: string, p: string,
  b?: unknown) => call(ctx.app, key, c, m, p, b);

describe("API key format", () => {
  it("round-trips and refuses near misses", () => {
    const k = formatApiKey("0123456789abcdef", new Uint8Array(32).fill(1));
    expect(parseApiKey(k)?.keyId).toBe("0123456789abcdef");
    expect(parseApiKey(k.replace("_0123456789abcdef", "_0123456789abcde")))
      .toBeNull();
    expect(parseApiKey(k.replace("abcdef", "ABCDEF"))).toBeNull();
    expect(parseApiKey(k.slice(0, -1))).toBeNull();
    expect(hashKeySecret("a")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKeySecret("a")).not.toBe(hashKeySecret("b"));
  });
});

describe("API keys", () => {
  it("apikey_create_owner_mfa and apikey_service_user", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "aka");
    const hr = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/api-keys", { name: "x", scopes: ["leave:read"] });
    expect(hr.status).toBe(403);
    const k = await newKey(ctx, s, ["employees:read"]);
    expect(parseApiKey(k.secret)).not.toBeNull();
    const table = JSON.stringify(await rowsOf(ctx, s.companyId,
      "SELECT * FROM api_keys"));
    expect(table).not.toContain(parseApiKey(k.secret)!.secret);
    const audit = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/audit-events?limit=200");
    const ev = audit.body.items.find((e: { action: string }) =>
      e.action === "apikey.created");
    expect(ev.data).toEqual({ scopes: ["employees:read"],
      rateLimitPerMinute: 120 });
    const keyId = parseApiKey(k.secret)!.keyId;
    const pw = await login(ctx.app, `apikey-${keyId}@service.invalid`,
      PASSWORD);
    expect(pw.status).toBe(401);
    const users = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/users");
    expect(users.text).not.toContain("service.invalid");
  });

  it("apikey_reads_employees with redaction by scope", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "akb");
    const read = await newKey(ctx, s, ["employees:read"]);
    const r = await asKey(ctx, read.secret, s.companyId, "GET",
      "/v1/employees");
    expect(r.status, r.text).toBe(200);
    expect(r.headers.get("ratelimit-limit")).toBe("120");
    expect(r.headers.get("ratelimit-remaining")).toBe("119");
    for (const v of Object.values(SENTINELS)) {
      for (const x of [v.salary, v.labour, v.eid]) {
        expect(r.text).not.toContain(x);
      }
    }
    const pay = await newKey(ctx, s, ["employees:read", "payroll:read"]);
    const p = await asKey(ctx, pay.secret, s.companyId, "GET",
      "/v1/employees");
    expect(p.text).toContain(SENTINELS.report.salary);
    const write = await newKey(ctx, s, ["employees:write"]);
    const created = await asKey(ctx, write.secret, s.companyId, "PATCH",
      `/v1/employees/${s.emp.report}`, { jobTitle: "Lead" });
    expect(created.status, created.text).toBe(200);
    expect(created.text).not.toContain(SENTINELS.report.salary);
    expect(created.text).not.toContain(SENTINELS.report.labour);
  });

  it("apikey_cannot_escape (Review Focus 3)", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "akc");
    const t = await seedCompany(ctx, "akcb");
    const k = await newKey(ctx, s);
    const run = (m: string, p: string, c = s.companyId, b?: unknown) =>
      asKey(ctx, k.secret, c, m, p, b);
    for (const [m, p] of [["GET", `/v1/employees/${s.emp.report}/bank`],
      ["POST", "/v1/pay-runs/00000000-0000-4000-8000-000000000001/approve"],
      ["GET", "/v1/api-keys"], ["POST", "/v1/webhook-endpoints"],
      ["GET", "/v1/me"], ["POST",
        "/v1/approvals/00000000-0000-4000-8000-000000000001/approve"],
      ["GET", "/v1/audit-events"]]) {
      const r = await run(m!, p!);
      expect(r.status, `${m} ${p}`).toBe(403);
      expect(r.body.error.code).toBe("API_KEY_ROUTE_NOT_ALLOWED");
    }
    const other = await run("GET", "/v1/employees", t.companyId);
    expect(other.status).toBe(401);
    expect(other.text).not.toContain("Person");
    const rot = await call(ctx.app, s.owner.token, s.companyId, "POST",
      `/v1/api-keys/${k.key.id}/rotate`, { graceHours: 1 });
    expect((await run("GET", "/v1/employees")).status).toBe(200);
    expect((await asKey(ctx, rot.body.secret, s.companyId, "GET",
      "/v1/employees")).status).toBe(200);
    ctx.clock.advance(3600_000 + 1000);
    expect((await run("GET", "/v1/employees")).status).toBe(401);
    await call(ctx.app, s.owner.token, s.companyId, "POST",
      `/v1/api-keys/${k.key.id}/revoke`);
    expect((await asKey(ctx, rot.body.secret, s.companyId, "GET",
      "/v1/employees")).status).toBe(401);
    const exp = await newKey(ctx, s, ALL, { expiresAt:
      new Date(ctx.clock.now.getTime() + 60_000).toISOString() });
    ctx.clock.advance(61_000);
    expect((await asKey(ctx, exp.secret, s.companyId, "GET",
      "/v1/employees")).status).toBe(401);
  });

  it("scope missing, rate limit, audited as service user, SSO", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "akd");
    const leave = await newKey(ctx, s, ["leave:read"]);
    const miss = await asKey(ctx, leave.secret, s.companyId, "GET",
      "/v1/employees");
    expect(miss.body.error).toMatchObject({ code: "SCOPE_MISSING",
      detail: { scope: "employees:read" } });
    const k = await newKey(ctx, s, ["employees:read", "employees:write"],
      { rateLimitPerMinute: 10 });
    const bad = await asKey(ctx, k.secret, s.companyId, "GET",
      "/v1/employees/00000000-0000-4000-8000-000000000001");
    expect(bad.status).toBe(404);
    for (let i = 0; i < 9; i++) {
      await asKey(ctx, k.secret, s.companyId, "GET", "/v1/employees");
    }
    const over = await asKey(ctx, k.secret, s.companyId, "GET",
      "/v1/employees");
    expect(over.status).toBe(429);
    expect(over.headers.get("retry-after")).not.toBeNull();
    ctx.clock.advance(60_000);
    const cur = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/sso-settings");
    await call(ctx.app, s.owner.token, s.companyId, "PUT", "/v1/sso-settings",
      { allowedDomains: [], googleHostedDomains: [], microsoftTenantIds: [],
        jitEmployees: false, enforceSso: true,
        expectedVersion: cur.body.version });
    const made = await asKey(ctx, k.secret, s.companyId, "POST",
      "/v1/employees", { number: "E-9", fullName: "Key Made",
        jobTitle: "Clerk", nationality: "IN",
        workerClass: "expat-full-time", joiningDate: "2020-01-01" });
    expect(made.status, made.text).toBe(201);
    const [svc] = await rowsOf<{ service_user_id: string }>(ctx,
      s.companyId, "SELECT service_user_id FROM api_keys WHERE id = $1",
      [k.key.id]);
    const audit = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/audit-events?limit=200");
    const ev = audit.body.items.find((e: { action: string;
      entityId: string }) => e.action === "employee.created" &&
      e.entityId === made.body.id);
    expect(ev.actorUserId).toBe(svc!.service_user_id);
  });

  it("M4: a revoked service-user membership stops the key", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "akm4");
    const k = await newKey(ctx, s, ["employees:read"]);
    expect((await asKey(ctx, k.secret, s.companyId, "GET",
      "/v1/employees")).status).toBe(200);
    await rowsOf(ctx, s.companyId, `UPDATE memberships SET revoked_at = $2
      WHERE company_id = $1 AND user_id = (SELECT service_user_id
        FROM api_keys WHERE company_id = $1) RETURNING user_id`,
    [s.companyId, ctx.clock.now.toISOString()]);
    const r = await asKey(ctx, k.secret, s.companyId, "GET",
      "/v1/employees");
    expect(r.status).toBe(401);
  });
});
