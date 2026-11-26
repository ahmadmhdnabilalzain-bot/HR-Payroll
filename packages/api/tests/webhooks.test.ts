import { createHmac } from "node:crypto";
import { WebhookEvent } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { deliverDueWebhooks } from "../src/webhooks/deliver";
import { enterOf, rowsOf } from "./helpers/channel-jobs";
import { SENTINELS, seedCompany, type Seeded } from "./helpers/seed";
import { call, enableMfa, makeApp, signup } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const HOST = "hooks.example.com";
const deliver = (ctx: Ctx) => deliverDueWebhooks(enterOf(ctx), ctx.deps);

async function world(name: string) {
  const ctx = await makeApp();
  const s = await seedCompany(ctx, name);
  ctx.fakes.dns.set(HOST, ["93.184.216.34"]);
  const ep = await call(ctx.app, s.owner.token, s.companyId, "POST",
    "/v1/webhook-endpoints", { url: `https://${HOST}/in`,
      events: ["employee.created", "employee.updated"] });
  return { ctx, s, ep: ep.body };
}

const touch = (ctx: Ctx, s: Seeded) => call(ctx.app, s.hr.token,
  s.companyId, "PATCH", `/v1/employees/${s.emp.report}`,
  { jobTitle: `T${Math.random()}` });

describe("webhook endpoints", () => {
  it("endpoint_create_owner_mfa and endpoint_url_refused", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "wha");
    const body = { url: `https://${HOST}/x`, events: ["employee.created"] };
    const post = (t: string, b: unknown) => call(ctx.app, t, s.companyId,
      "POST", "/v1/webhook-endpoints", b);
    expect((await post(s.hr.token, body)).status).toBe(403);
    const ok = await post(s.owner.token, body);
    expect(ok.status, ok.text).toBe(201);
    expect(ok.body.secret.startsWith("whsec_")).toBe(true);
    const list = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/webhook-endpoints");
    expect(list.text).not.toContain(ok.body.secret);
    const table = JSON.stringify(await rowsOf(ctx, s.companyId,
      "SELECT * FROM webhook_endpoints"));
    expect(table).not.toContain(ok.body.secret);
    const audit = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/audit-events?limit=200");
    expect(audit.text).not.toContain(HOST);
    for (const url of ["http://x.example.com", "https://10.0.0.1/"]) {
      const r = await post(s.owner.token, { ...body, url });
      expect(r.body.error.code).toBe("WEBHOOK_URL_NOT_ALLOWED");
    }
    for (let i = 0; i < 9; i++) await post(s.owner.token, body);
    expect((await post(s.owner.token, body)).body.error.code)
      .toBe("WEBHOOK_ENDPOINT_LIMIT");
  });

  it("delivery_signed_and_verifiable and webhook_no_leak_no_ssrf",
    async () => {
      const { ctx, s, ep } = await world("whb");
      await touch(ctx, s);
      expect((await deliver(ctx)).succeeded).toBe(1);
      const req = ctx.fakes.http.requests[0]!;
      const id = req.headers["x-webhook-id"]!;
      const ts = req.headers["x-webhook-timestamp"]!;
      const want = createHmac("sha256", ep.secret)
        .update(`${id}.${ts}.${req.body}`).digest("hex");
      expect(req.headers["x-webhook-signature"]).toBe(`v1=${want}`);
      expect(WebhookEvent.safeParse(JSON.parse(req.body!)).success)
        .toBe(true);
      expect(req.pinAddress).toBe("93.184.216.34");
      for (const v of Object.values(SENTINELS)) {
        for (const x of [v.salary, v.iban]) {
          expect(req.body).not.toContain(x);
        }
      }
      ctx.fakes.dns.set(HOST, ["10.0.0.5"]);
      await touch(ctx, s);
      await deliver(ctx);
      expect(ctx.fakes.http.requests.length).toBe(1);
      ctx.fakes.dns.set(HOST, ["93.184.216.34"]);
      ctx.fakes.http.script.push(() => ({ status: 302,
        headers: { location: "https://169.254.169.254/" }, body: "" }));
      await touch(ctx, s);
      await deliver(ctx);
      expect(ctx.fakes.http.requests.length).toBe(2);
      const errs = await rowsOf<{ error: string | null }>(ctx, s.companyId,
        "SELECT error FROM webhook_attempts ORDER BY at, n");
      expect(errs.map((e) => e.error)).toEqual([null, "HOST_NOT_PUBLIC",
        "REDIRECT_NOT_FOLLOWED"]);
    });

  it("delivery_retries_and_pauses (410 pauses at once)", async () => {
    const { ctx, s, ep } = await world("whc");
    const status = async () => (await rowsOf<{ status: string;
      paused_reason: string | null }>(ctx, s.companyId,
    "SELECT status, paused_reason FROM webhook_endpoints WHERE id = $1",
    [ep.id]))[0];
    ctx.fakes.http.script.push(() => ({ status: 410, headers: {},
      body: "" }));
    await touch(ctx, s);
    await deliver(ctx);
    expect(await status()).toEqual({ status: "paused",
      paused_reason: "gone" });
    const n = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/me/notifications");
    expect(n.body.items.map((x: { kind: string }) => x.kind))
      .toContain("webhook-paused");
    await call(ctx.app, s.owner.token, s.companyId, "PATCH",
      `/v1/webhook-endpoints/${ep.id}`, { status: "active" });
    await touch(ctx, s);
    for (let i = 0; i < 8; i++) {
      ctx.fakes.http.script.push(() => ({ status: 500, headers: {},
        body: "" }));
      await deliver(ctx);
      ctx.clock.advance(1441 * 60_000);
    }
    const rows = await rowsOf<{ status: string; attempt_count: number }>(
      ctx, s.companyId, "SELECT status, attempt_count FROM " +
      "webhook_deliveries ORDER BY created_at, id");
    expect(rows.at(-1)).toEqual({ status: "failed", attempt_count: 8 });
    expect((await status())!.status).toBe("active");
  });

  it("rotation_grace, replay_same_event_id, test_ping, cross tenant",
    async () => {
      const { ctx, s, ep } = await world("whd");
      const rot = await call(ctx.app, s.owner.token, s.companyId, "POST",
        `/v1/webhook-endpoints/${ep.id}/rotate-secret`, { graceHours: 1 });
      await touch(ctx, s);
      await deliver(ctx);
      const sig = ctx.fakes.http.requests[0]!.headers["x-webhook-signature"];
      expect(sig!.split(",")).toHaveLength(2);
      const [d] = await rowsOf<{ id: string }>(ctx, s.companyId,
        "SELECT id FROM webhook_deliveries");
      ctx.clock.advance(3600_000 + 1000);
      const re = await call(ctx.app, s.owner.token, s.companyId, "POST",
        `/v1/webhook-deliveries/${d!.id}/redeliver`);
      expect(re.status, re.text).toBe(201);
      await deliver(ctx);
      const [a, b] = ctx.fakes.http.requests;
      expect(b!.headers["x-webhook-id"]).toBe(a!.headers["x-webhook-id"]);
      expect(b!.headers["x-webhook-signature"]!.split(",")).toHaveLength(1);
      const want = createHmac("sha256", rot.body.secret).update(
        `${b!.headers["x-webhook-id"]}.${b!.headers["x-webhook-timestamp"]}.${
          b!.body}`).digest("hex");
      expect(b!.headers["x-webhook-signature"]).toBe(`v1=${want}`);
      await call(ctx.app, s.owner.token, s.companyId, "PATCH",
        `/v1/webhook-endpoints/${ep.id}`, { status: "paused" });
      const ping = await call(ctx.app, s.owner.token, s.companyId, "POST",
        `/v1/webhook-endpoints/${ep.id}/test`);
      expect(ping.body.eventType).toBe("ping");
      expect((await deliver(ctx)).succeeded).toBe(1);
      const other = await signup(ctx.app, "whdo");
      const mfa = await enableMfa(ctx.app, ctx.clock, other);
      const x = await call(ctx.app, mfa.token, other.companyId, "POST",
        `/v1/webhook-deliveries/${d!.id}/redeliver`);
      expect(x.status).toBe(404);
    });
});
