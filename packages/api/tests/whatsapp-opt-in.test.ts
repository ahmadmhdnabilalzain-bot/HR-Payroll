import { describe, expect, it } from "vitest";
import {
  dispatch,
  enableWhatsApp,
  optIn,
  rowsOf,
  setPrefs,
} from "./helpers/channel-jobs";
import {
  EXPENSE_START,
  meal,
  setupExpenses,
  submitted,
} from "./helpers/expense-fixtures";
import { fakeChannels } from "./helpers/fake-channels";
import { seedCompany } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

const PHONE = "+971500000001";
const start = (ctx: Awaited<ReturnType<typeof makeApp>>, token: string,
  c: string) => call(ctx.app, token, c, "POST",
  "/v1/me/channels/whatsapp/opt-in", { phone: PHONE, consentVersion: 1,
    agreed: true });
const verify = (ctx: Awaited<ReturnType<typeof makeApp>>, token: string,
  c: string, code: string) => call(ctx.app, token, c, "POST",
  "/v1/me/channels/whatsapp/verify", { code });

async function auditData(ctx: Awaited<ReturnType<typeof makeApp>>,
  token: string, c: string, action: string) {
  const r = await call(ctx.app, token, c, "GET",
    "/v1/audit-events?limit=200");
  return r.body.items.filter((e: { action: string }) => e.action === action)
    .map((e: { data: unknown }) => e.data);
}

describe("WhatsApp opt-in", () => {
  it("opt_in_flow, phone_never_in_clear, consent_text_has_company",
    async () => {
      const ctx = await makeApp({ start: EXPENSE_START });
      const s = await seedCompany(ctx, "woi");
      await enableWhatsApp(ctx, s);
      const me = await optIn(ctx, s, s.employee, PHONE);
      expect(me.whatsapp).toMatchObject({ status: "active",
        phoneLast4: "0001", consentVersion: 1 });
      const sent = ctx.fakes.outbox.whatsapp[0] as { templateName: string;
        bodyParams: string[]; toE164: string };
      expect(sent.templateName).toBe("verify_code_v1");
      expect(sent.toE164).toBe(PHONE);
      expect(sent.bodyParams[0]).toMatch(/^\d{6}$/);
      expect(await auditData(ctx, s.owner.token, s.companyId,
        "whatsapp.opted-in")).toEqual([{ consentVersion: 1 }]);
      const table = JSON.stringify(await rowsOf(ctx, s.companyId,
        "SELECT * FROM channel_opt_ins"));
      expect(table).not.toContain(PHONE);
      expect(table).not.toContain("500000001");
      const audit = await call(ctx.app, s.owner.token, s.companyId, "GET",
        "/v1/audit-events?limit=200");
      expect(audit.text).not.toContain("500000001");
      const mine = await call(ctx.app, s.employee.token, s.companyId,
        "GET", "/v1/me/channels");
      expect(mine.text).not.toContain("500000001");
      expect(mine.body.consentText).toContain("woi Trading LLC");
      expect(mine.body.consentText).toContain("STOP");
    });

  it("opt_in_wrong_code_five_times and opt_in_expired", async () => {
    const ctx = await makeApp({ start: EXPENSE_START });
    const s = await seedCompany(ctx, "wow");
    await enableWhatsApp(ctx, s);
    expect((await start(ctx, s.employee.token, s.companyId)).status)
      .toBe(200);
    for (let i = 0; i < 5; i++) {
      const r = await verify(ctx, s.employee.token, s.companyId, "000000");
      expect(r.body.error.code).toBe("VERIFY_CODE_INVALID");
    }
    const after = await call(ctx.app, s.employee.token, s.companyId, "GET",
      "/v1/me/channels");
    expect(after.body.whatsapp.status).toBe("withdrawn");
    await start(ctx, s.employee.token, s.companyId);
    ctx.clock.advance(11 * 60_000);
    const late = await verify(ctx, s.employee.token, s.companyId, "000000");
    expect(late.status).toBe(410);
    expect(late.body.error.code).toBe("VERIFY_CODE_EXPIRED");
  });

  it("opt_in_requires_company_switch and opt_in_rate_limit", async () => {
    const ctx = await makeApp({ start: EXPENSE_START });
    const s = await seedCompany(ctx, "wos");
    const off = await start(ctx, s.employee.token, s.companyId);
    expect(off.body.error.code).toBe("CHANNEL_DISABLED");
    await enableWhatsApp(ctx, s);
    for (let i = 0; i < 5; i++) {
      expect((await start(ctx, s.employee.token, s.companyId)).status)
        .toBe(200);
    }
    const sixth = await start(ctx, s.employee.token, s.companyId);
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("RATE_LIMITED");
    const nc = await makeApp({ channels: fakeChannels({ whatsapp: false }) });
    const t = await seedCompany(nc, "wonc");
    const r = await start(nc, t.employee.token, t.companyId);
    expect(r.body.error.code).toBe("CHANNEL_NOT_CONFIGURED");
  });

  it("withdraw_skips_queued", async () => {
    const ctx = await makeApp({ start: EXPENSE_START });
    const s = await seedCompany(ctx, "wod");
    const cats = await setupExpenses(ctx, s);
    await enableWhatsApp(ctx, s);
    await optIn(ctx, s, s.manager, "+971500000002");
    await setPrefs(ctx, s, s.manager, "approval-pending",
      { email: false, whatsapp: true });
    await submitted(ctx, s.employee, s, [meal(cats, "5.00")]);
    const w = await call(ctx.app, s.manager.token, s.companyId, "POST",
      "/v1/me/channels/whatsapp/withdraw");
    expect(w.body.whatsapp.status).toBe("withdrawn");
    const rows = await rowsOf<{ channel: string; status: string;
      reason: string | null; fallback_of: string | null }>(ctx,
      s.companyId, `SELECT channel, status, reason, fallback_of
        FROM notification_deliveries WHERE user_id = $1
          AND kind = 'approval-pending'`, [s.manager.userId]);
    expect(rows.find((r) => r.channel === "whatsapp")).toMatchObject(
      { status: "skipped", reason: "no-opt-in" });
    expect(rows.some((r) => r.fallback_of !== null)).toBe(true);
    expect(await auditData(ctx, s.owner.token, s.companyId,
      "whatsapp.opted-out")).toEqual([{ via: "app" }]);
    await dispatch(ctx);
    expect(ctx.fakes.outbox.email.map((m) => m.to)).toEqual(
      [s.manager.email]);
  });
});
