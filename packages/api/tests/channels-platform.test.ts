import { describe, expect, it } from "vitest";
import { actorCtx } from "../src/channels/actor";
import { channelAudit } from "../src/channels/audit";
import { notConfiguredPorts } from "../src/channels/not-configured";
import { consumeRate, windowStart } from "../src/channels/rate";
import { markSeen } from "../src/channels/seen";
import { keyringFromKey } from "../src/crypto/keyring";
import { withTenant } from "../src/db/tenant";
import { fakeChannels } from "./helpers/fake-channels";
import { seedCompany } from "./helpers/seed";
import { call, makeApp, signup } from "./helpers/test-app";

const at = (s: string) => new Date(s);
const BASE = { publicApiBaseUrl: "https://api.test.example",
  publicAppBaseUrl: "https://app.test.example" };

async function auditOf(ctx: Awaited<ReturnType<typeof makeApp>>,
  token: string, companyId: string, action: string) {
  const r = await call(ctx.app, token, companyId, "GET",
    "/v1/audit-events?limit=200");
  return r.body.items.filter((e: { action: string }) =>
    e.action === action);
}

describe("channel settings", () => {
  it("channel_settings_defaults", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "chdef");
    const r = await call(ctx.app, s.hr.token, s.companyId, "GET",
      "/v1/channel-settings");
    expect(r.status, r.text).toBe(200);
    expect(r.body).toMatchObject({ version: 0, whatsappEnabled: false,
      emailEnabled: true, whatsappDailyCap: 200 });
    expect(r.body.providers.email).toBe("configured");
    const off = await makeApp({ channels: fakeChannels({ email: false }) });
    const a = await signup(off.app, "choff");
    const r2 = await call(off.app, a.token, a.companyId, "GET",
      "/v1/channel-settings");
    expect(r2.body.providers.email).toBe("not-configured");
  });

  it("channel_settings_owner_mfa", async () => {
    const ctx = await makeApp({ channels: fakeChannels({ whatsapp: false }) });
    const s = await seedCompany(ctx, "chput");
    const body = { whatsappEnabled: false, whatsappApprovals: false,
      whatsappDailyCap: 200, whatsappHourlyPerUser: 20,
      emailEnabled: false, expectedVersion: 0 };
    const put = (token: string, b: unknown) => call(ctx.app, token,
      s.companyId, "PUT", "/v1/channel-settings", b);
    expect((await put(s.hr.token, body)).body.error.code).toBe("FORBIDDEN");
    const plain = await signup(ctx.app, "chplain");
    const noMfa = await put(plain.token, body);
    expect(noMfa.status).toBe(403);
    const ok = await put(s.owner.token, body);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.version).toBe(1);
    const stale = await put(s.owner.token, body);
    expect(stale.body.error.code).toBe("SETTINGS_VERSION_CONFLICT");
    const wa = await put(s.owner.token, { ...body, expectedVersion: 1,
      whatsappEnabled: true });
    expect(wa.body.error.code).toBe("CHANNEL_NOT_CONFIGURED");
    const events = await auditOf(ctx, s.owner.token, s.companyId,
      "channel.settings-updated");
    expect(events.map((e: { data: unknown }) => e.data))
      .toEqual([{ changed: ["emailEnabled"] }]);
  });
});

describe("channel platform", () => {
  it("channel_audit_refuses_sensitive", async () => {
    const ctx = await makeApp();
    const a = await signup(ctx.app, "chaud");
    const t = { companyId: a.companyId, userId: null };
    const e = (data: Record<string, unknown>) => ({ companyId: a.companyId,
      at: "2026-03-01T08:00:00.000Z", actorUserId: null,
      action: "channel.settings-updated", entityType: "company",
      entityId: a.companyId, data: data as never });
    await expect(withTenant(ctx.deps.db, t, (tx) =>
      channelAudit(tx, e({ phone: "x" })))).rejects.toMatchObject(
      { code: "AUDIT_SENSITIVE_DATA" });
    await expect(withTenant(ctx.deps.db, t, (tx) =>
      channelAudit(tx, e({ nested: { token: "x" } }))))
      .rejects.toMatchObject({ code: "AUDIT_SENSITIVE_DATA" });
    const ok = await withTenant(ctx.deps.db, t, (tx) =>
      channelAudit(tx, e({ changed: ["emailEnabled"] })));
    expect(ok.data).toEqual({ changed: ["emailEnabled"] });
  });

  it("rate_window_counts", async () => {
    const ctx = await makeApp();
    const a = await signup(ctx.app, "chra");
    const b = await signup(ctx.app, "chrb");
    const run = (c: string, now: Date) => withTenant(ctx.deps.db,
      { companyId: c, userId: null }, (tx) =>
        consumeRate(tx, c, "test", "k", 2, 60, now));
    const t0 = at("2026-03-01T10:00:05Z");
    const r = [await run(a.companyId, t0), await run(a.companyId, t0),
      await run(a.companyId, t0)];
    expect(r.map((x) => x.allowed)).toEqual([true, true, false]);
    expect(r.map((x) => x.remaining)).toEqual([1, 0, 0]);
    expect(r[0]!.resetAt.toISOString()).toBe("2026-03-01T10:01:00.000Z");
    expect((await run(a.companyId, at("2026-03-01T10:01:00Z"))).allowed)
      .toBe(true);
    expect((await run(b.companyId, t0)).allowed).toBe(true);
    expect(windowStart(t0.getTime(), 60)).toBe(1772359200);
  });

  it("mark_seen_once", async () => {
    const ctx = await makeApp();
    const a = await signup(ctx.app, "chseen");
    const seen = (id: string) => withTenant(ctx.deps.db,
      { companyId: a.companyId, userId: null }, (tx) =>
        markSeen(tx, a.companyId, "email", id, ctx.clock.now));
    expect(await seen("m-1")).toBe(true);
    expect(await seen("m-1")).toBe(false);
    const both = await Promise.all([seen("m-2"), seen("m-2")]);
    expect(both.filter((x) => x).length).toBe(1);
  });

  it("actor_ctx_requires_membership", async () => {
    const ctx = await makeApp();
    const a = await signup(ctx.app, "chact");
    const b = await signup(ctx.app, "chactb");
    const t = { companyId: a.companyId, userId: b.userId };
    await expect(withTenant(ctx.deps.db, t, (tx) => actorCtx(tx, ctx.deps,
      a.companyId, b.userId, "whatsapp"))).rejects.toMatchObject(
      { code: "TENANT_FORBIDDEN" });
    const me = await withTenant(ctx.deps.db,
      { companyId: a.companyId, userId: a.userId }, (tx) =>
        actorCtx(tx, ctx.deps, a.companyId, a.userId, "email-in"));
    expect(me.session!.mfa).toBe(false);
    expect(me.session!.via).toBe("email-in");
    expect(me.tenant!.role).toBe("owner");
  });

  it("keyring_derive_stable", () => {
    const rand = (n: number) => new Uint8Array(n);
    const k1 = keyringFromKey(new Uint8Array(32).fill(1), rand);
    const k2 = keyringFromKey(new Uint8Array(32).fill(2), rand);
    const x = k1.derive("payroll/wa-action/v1");
    expect(x.length).toBe(32);
    expect(Buffer.from(k1.derive("payroll/wa-action/v1"))).toEqual(
      Buffer.from(x));
    expect(Buffer.from(k1.derive("payroll/phone-hash/v1"))).not.toEqual(
      Buffer.from(x));
    expect(Buffer.from(k2.derive("payroll/wa-action/v1"))).not.toEqual(
      Buffer.from(x));
  });

  it("not_configured_ports", async () => {
    const p = notConfiguredPorts(BASE);
    expect(p.email.configured).toBe(false);
    expect(await p.email.send({ to: "a@b.test", subject: "s", text: "t",
      idempotencyKey: "k" })).toEqual({ status: "not-configured" });
    expect(await p.whatsapp.sendText({ toE164: "+971500000001", text: "t",
      idempotencyKey: "k" })).toEqual({ status: "not-configured" });
    expect(p.whatsappInbound.verifySignature("{}", "sha256=00"))
      .toBe(false);
    expect(p.inboundEmail.authenticate("Basic eDp5")).toBe(false);
    expect(p.oidc.configured("google")).toBe(false);
    expect(await p.resolveHost("example.com")).toEqual([]);
    await expect(p.http.send({ method: "GET", url: "https://x.test",
      headers: {}, timeoutMs: 10 })).rejects.toMatchObject(
      { code: "NETWORK" });
  });
});
