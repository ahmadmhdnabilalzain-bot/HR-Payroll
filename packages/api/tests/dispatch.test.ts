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
import {
  addOwner,
  march,
  postRun,
  SENTINELS,
  seedCompany,
  type Seeded,
} from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
interface Row { id: string; channel: string; status: string;
  reason: string | null; not_before: string | null; attempts: number;
  provider_message_id: string | null; fallback_of: string | null;
  kind: string }

const rows = (ctx: Ctx, s: Seeded, userId: string) => rowsOf<Row>(ctx,
  s.companyId, `SELECT * FROM notification_deliveries WHERE user_id = $1
    ORDER BY created_at, id`, [userId]);

async function world(name: string, opts: Parameters<typeof makeApp>[0] =
  {}) {
  const ctx = await makeApp({ start: EXPENSE_START, ...opts });
  const s = await seedCompany(ctx, name);
  const cats = await setupExpenses(ctx, s);
  const claim = (amount = "40.00") => submitted(ctx, s.employee, s,
    [meal(cats, amount)]);
  return { ctx, s, claim };
}

const emailOf = (rs: Row[]) => rs.filter((r) => r.channel === "email");

describe("dispatchDue", () => {
  it("dispatch_sends_email", async () => {
    const { ctx, s, claim } = await world("dse");
    await claim();
    const out = await dispatch(ctx);
    expect(out.sent).toBe(1);
    expect(ctx.fakes.outbox.email).toEqual([expect.objectContaining({
      to: s.manager.email, subject: "Approval waiting: expense claim" })]);
    const [e] = emailOf(await rows(ctx, s, s.manager.userId));
    expect(e).toMatchObject({ status: "sent",
      provider_message_id: "email-1" });
    expect((await dispatch(ctx)).sent).toBe(0);
    expect(ctx.fakes.outbox.email.length).toBe(1);
  });

  it("dispatch_retries_then_fails", async () => {
    const { ctx, s, claim } = await world("dsr");
    for (let i = 0; i < 4; i++) ctx.fakes.failNext("email",
      { status: "failed", retryable: true, code: "HTTP_503" });
    await claim();
    const steps: [string, number | null][] = [];
    for (const wait of [1, 5, 30, 0]) {
      await dispatch(ctx);
      const [e] = emailOf(await rows(ctx, s, s.manager.userId));
      const nb = e!.not_before === null ? null
        : (new Date(e!.not_before).getTime() - ctx.clock.now.getTime())
          / 60_000;
      steps.push([e!.status, nb]);
      ctx.clock.advance(wait * 60_000);
    }
    expect(steps).toEqual([["queued", 1], ["queued", 5], ["queued", 30],
      ["failed", 0]]);
  });

  it("held_until_quiet_end", async () => {
    const ctx = await makeApp({ start: "2026-03-01T19:30:00.000Z" });
    const s = await seedCompany(ctx, "dsq");
    const cats = await setupExpenses(ctx, s);
    ctx.clock.now = new Date("2026-03-01T19:30:00.000Z");
    await submitted(ctx, s.employee, s, [meal(cats, "9.00",
      { date: "2026-03-01" })]);
    ctx.clock.now = new Date("2026-03-01T20:00:00.000Z");
    expect((await dispatch(ctx)).sent).toBe(0);
    ctx.clock.now = new Date("2026-03-02T03:00:00.000Z");
    expect((await dispatch(ctx)).sent).toBe(1);
  });

  it("whatsapp_without_opt_in_falls_back", async () => {
    const { ctx, s, claim } = await world("dsw");
    await enableWhatsApp(ctx, s);
    await setPrefs(ctx, s, s.manager, "approval-pending",
      { email: false, whatsapp: true });
    await claim();
    const first = await dispatch(ctx);
    expect(first.fellBack).toBe(1);
    await dispatch(ctx);
    const rs = await rows(ctx, s, s.manager.userId);
    const wa = rs.find((r) => r.channel === "whatsapp")!;
    expect(wa).toMatchObject({ status: "skipped", reason: "no-opt-in" });
    const fb = rs.find((r) => r.fallback_of === wa.id)!;
    expect(fb).toMatchObject({ channel: "email", status: "sent" });
    expect(ctx.fakes.outbox.email.map((m) => m.to)).toEqual(
      [s.manager.email]);
  });

  it("whatsapp_rate_limited_falls_back", async () => {
    const { ctx, s, claim } = await world("dsl");
    await enableWhatsApp(ctx, s, { whatsappHourlyPerUser: 1 });
    await optIn(ctx, s, s.manager, "+971500000009");
    await setPrefs(ctx, s, s.manager, "approval-pending",
      { email: false, whatsapp: true });
    await claim("10.00");
    await claim("11.00");
    await dispatch(ctx);
    await dispatch(ctx);
    const wa = (await rows(ctx, s, s.manager.userId)).filter((r) =>
      r.channel === "whatsapp" && r.kind === "approval-pending");
    expect(wa.map((r) => [r.status, r.reason])).toEqual([["sent", null],
      ["skipped", "rate-limited"]]);
    expect(ctx.fakes.outbox.email.map((m) => m.to)).toEqual(
      [s.manager.email]);
  });

  it("lease_expiry_redelivers", async () => {
    const { ctx, s, claim } = await world("dsx");
    await claim();
    const [e] = emailOf(await rows(ctx, s, s.manager.userId));
    await rowsOf(ctx, s.companyId, `UPDATE notification_deliveries SET
      status = 'sending', attempts = 1, lease_until = $2 WHERE id = $1`,
    [e!.id, "2026-03-20T07:00:00.000Z"]);
    expect((await dispatch(ctx)).sent).toBe(1);
    const [again] = emailOf(await rows(ctx, s, s.manager.userId));
    expect(again).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("not_configured_recorded", async () => {
    const { ctx, s, claim } = await world("dsn",
      { channels: fakeChannels({ email: false }) });
    await claim();
    const out = await dispatch(ctx);
    expect(out.sent).toBe(0);
    const [e] = emailOf(await rows(ctx, s, s.manager.userId));
    expect(e!.status).toBe("not-configured");
  });

  it("dispatch_crosses_tenants", async () => {
    const ctx = await makeApp({ start: EXPENSE_START });
    const a = await seedCompany(ctx, "dsa");
    const b = await seedCompany(ctx, "dsb");
    for (const s of [a, b]) {
      const cats = await setupExpenses(ctx, s);
      await submitted(ctx, s.employee, s, [meal(cats, "7.00")]);
    }
    expect((await dispatch(ctx)).sent).toBe(2);
    expect(ctx.fakes.outbox.email.map((m) => m.to).sort()).toEqual(
      [a.manager.email, b.manager.email].sort());
  });

  it("outbox_has_no_sentinels", async () => {
    const { ctx, s, claim } = await world("dss");
    await enableWhatsApp(ctx, s);
    await optIn(ctx, s, s.employee, "+971500000003");
    for (const k of ["approval-closed", "leave-decided",
      "payslip-available"]) {
      await setPrefs(ctx, s, s.employee, k, { email: true, whatsapp: true });
    }
    const c = await claim("77.77");
    await call(ctx.app, s.manager.token, s.companyId, "POST",
      `/v1/approvals/${c.approval.id}/approve`, { stepOrder: 1 });
    const lt = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/leave-types", { name: "Annual", paid: true, annualDays: 30 });
    const lr = await call(ctx.app, s.employee.token, s.companyId, "POST",
      "/v1/leave-requests", { leaveTypeId: lt.body.id,
        startDate: "2026-04-06", endDate: "2026-04-06" });
    await call(ctx.app, s.manager.token, s.companyId, "POST",
      `/v1/leave-requests/${lr.body.id}/approve`, {});
    const owner2 = await addOwner(ctx, s);
    const run = await postRun(ctx, s.hr, s, "dss-1", march);
    const ok = await call(ctx.app, owner2.token, s.companyId, "POST",
      `/v1/pay-runs/${run.body.id}/approve`);
    expect(ok.status, ok.text).toBe(200);
    await dispatch(ctx);
    const text = JSON.stringify(ctx.fakes.outbox);
    expect(ctx.fakes.outbox.whatsapp.length).toBeGreaterThan(3);
    expect(text).toContain("payslip");
    for (const v of Object.values(SENTINELS)) {
      for (const x of [v.salary, v.fils, v.gross, v.iban, v.labour, v.eid]) {
        expect(text).not.toContain(x);
      }
    }
    expect(text).not.toContain("77.77");
    expect(/\d{14}/.test(text)).toBe(false);
  });
});
