import { beforeAll, describe, expect, it } from "vitest";
import { emitEvent } from "../src/channels/events";
import { withTenant } from "../src/db/tenant";
import {
  EXPENSE_START,
  meal,
  setupExpenses,
  submitted,
  type Cats,
} from "./helpers/expense-fixtures";
import {
  addOwner,
  march,
  postRun,
  SENTINELS,
  seedCompany,
  type Seeded,
  type SeedUser,
} from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

const get = (ctx: Ctx, u: SeedUser, s: Seeded, path: string) =>
  call(ctx.app, u.token, s.companyId, "GET", path);

async function deliveries(ctx: Ctx, s: Seeded, userId: string) {
  const r = await get(ctx, s.hr, s, `/v1/notification-deliveries?userId=${
    userId}&limit=100`);
  return r.body.items as { kind: string; channel: string; status: string;
    reason: string | null; notBefore: string | null }[];
}

async function notices(ctx: Ctx, u: SeedUser, s: Seeded) {
  return (await get(ctx, u, s, "/v1/me/notifications")).body.items as
    { id: string; kind: string; title: string; body: string }[];
}

describe("notifications", () => {
  let ctx: Ctx;
  let s: Seeded;
  let cats: Cats;
  beforeAll(async () => {
    ctx = await makeApp({ start: EXPENSE_START });
    s = await seedCompany(ctx, "ntf");
    cats = await setupExpenses(ctx, s);
  });

  it("approval_opened_notifies_eligible and closed_notifies_claimant",
    async () => {
      const c = await submitted(ctx, s.employee, s, [meal(cats, "50.00")]);
      const m = await notices(ctx, s.manager, s);
      expect(m.map((n) => n.kind)).toEqual(["approval-pending"]);
      expect(m[0]!.body).toContain("Person 2 asked you to approve");
      const d = await deliveries(ctx, s, s.manager.userId);
      expect(d.find((x) => x.channel === "email")?.status).toBe("queued");
      expect(await notices(ctx, s.employee, s)).toEqual([]);
      await call(ctx.app, s.manager.token, s.companyId, "POST",
        `/v1/approvals/${c.approval.id}/approve`, { stepOrder: 1 });
      const e = await notices(ctx, s.employee, s);
      expect(e.map((n) => n.kind)).toEqual(["approval-closed"]);
      expect(e[0]!.title).toBe("Your expense claim was approved");
    });

  it("deliveries_log_owner_hr and payload_encrypted", async () => {
    const r = await get(ctx, s.hr, s, "/v1/notification-deliveries");
    expect(r.status).toBe(200);
    expect(r.text).not.toContain("@example.com");
    expect(r.text).not.toContain("asked you to approve");
    const emp = await get(ctx, s.employee, s, "/v1/notification-deliveries");
    expect(emp.status).toBe(403);
    const rows = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => tx.query<{ payload_enc: string }>(
      "SELECT payload_enc FROM notification_deliveries"));
    expect(rows.length).toBeGreaterThan(0);
    for (const x of rows) expect(x.payload_enc).not.toContain("Person 2");
  });

  it("inbox_own_only", async () => {
    const mine = await notices(ctx, s.manager, s);
    const other = await call(ctx.app, s.employee.token, s.companyId, "POST",
      "/v1/me/notifications/read", { ids: [mine[0]!.id] });
    expect(other.body).toEqual({ updated: 0 });
    const own = await call(ctx.app, s.manager.token, s.companyId, "POST",
      "/v1/me/notifications/read", { all: true });
    expect(own.body.updated).toBeGreaterThan(0);
    const unread = await get(ctx, s.manager, s,
      "/v1/me/notifications?unreadOnly=true");
    expect(unread.body.items).toEqual([]);
  });

  it("templates are listed for owner and hr", async () => {
    const r = await get(ctx, s.hr, s, "/v1/notification-templates");
    expect(r.body.items.length).toBe(9);
    expect(r.body.items.every((t: { arReviewed: boolean }) =>
      !t.arReviewed)).toBe(true);
    expect((await get(ctx, s.manager, s, "/v1/notification-templates"))
      .status).toBe(403);
  });
});

describe("preferences and holds", () => {
  it("quiet_hours_hold, prefs_channel_off, company_email_disabled",
    async () => {
      const ctx = await makeApp({ start: "2026-03-01T19:30:00.000Z" });
      const s = await seedCompany(ctx, "ntq");
      const cats = await setupExpenses(ctx, s);
      const prefs = await get(ctx, s.manager, s, "/v1/me/notification-prefs");
      expect(prefs.body.quietHours).toEqual({ enabled: true,
        start: "22:00", end: "07:00" });
      ctx.clock.now = new Date("2026-03-01T19:30:00.000Z");
      await submitted(ctx, s.employee, s, [meal(cats, "20.00",
        { date: "2026-03-01" })]);
      const d = await deliveries(ctx, s, s.manager.userId);
      const email = d.find((x) => x.kind === "approval-pending" &&
        x.channel === "email")!;
      expect(email.status).toBe("held");
      expect(email.notBefore).toBe("2026-03-02T03:00:00.000Z");
      await withTenant(ctx.deps.db, { companyId: s.companyId,
        userId: null }, (tx) => emitEvent({ tx, deps: ctx.deps,
        companyId: s.companyId }, { type: "sso.linked",
        userId: s.manager.userId, provider: "google" }));
      const sso = (await deliveries(ctx, s, s.manager.userId)).find((x) =>
        x.kind === "security-sso-linked" && x.channel === "email")!;
      expect(sso.status).toBe("queued");
      const { note: _n, ...body } = prefs.body;
      body.kinds["approval-pending"].email = false;
      const put = await call(ctx.app, s.manager.token, s.companyId, "PUT",
        "/v1/me/notification-prefs", body);
      expect(put.status, put.text).toBe(200);
      await submitted(ctx, s.employee, s, [meal(cats, "21.00",
        { date: "2026-03-01" })]);
      const off = (await deliveries(ctx, s, s.manager.userId)).filter((x) =>
        x.kind === "approval-pending" && x.channel === "email");
      expect(off[0]).toMatchObject({ status: "skipped",
        reason: "channel-off" });
      const n = await notices(ctx, s.manager, s);
      expect(n.filter((x) => x.kind === "approval-pending").length).toBe(2);
      const cs = await get(ctx, s.owner, s, "/v1/channel-settings");
      await call(ctx.app, s.owner.token, s.companyId, "PUT",
        "/v1/channel-settings", { whatsappEnabled: false,
          whatsappApprovals: false, whatsappDailyCap: 200,
          whatsappHourlyPerUser: 20, emailEnabled: false,
          expectedVersion: cs.body.version });
      await submitted(ctx, s.employee, s, [meal(cats, "22.00",
        { date: "2026-03-01" })]);
      const dis = (await deliveries(ctx, s, s.manager.userId)).filter((x) =>
        x.kind === "approval-pending" && x.channel === "email");
      expect(dis[0]).toMatchObject({ status: "skipped",
        reason: "company-disabled" });
    });
});

describe("leave and pay-run events", () => {
  it("leave_events and pay_run_approved_notifies_employees", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "ntl");
    const lt = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/leave-types", { name: "Annual", paid: true, annualDays: 30 });
    const req = await call(ctx.app, s.employee.token, s.companyId, "POST",
      "/v1/leave-requests", { leaveTypeId: lt.body.id,
        startDate: "2026-04-06", endDate: "2026-04-07" });
    expect(req.status, req.text).toBe(201);
    const m = await notices(ctx, s.manager, s);
    expect(m[0]).toMatchObject({ kind: "leave-requested",
      title: "Leave request from Person 2" });
    await call(ctx.app, s.manager.token, s.companyId, "POST",
      `/v1/leave-requests/${req.body.id}/approve`, {});
    const e = await notices(ctx, s.employee, s);
    expect(e[0]).toMatchObject({ kind: "leave-decided",
      body: "Your leave from 2026-04-06 to 2026-04-07 was approved." });
    const owner2 = await addOwner(ctx, s);
    const run = await postRun(ctx, s.hr, s, "nt-1", march);
    await call(ctx.app, owner2.token, s.companyId, "POST",
      `/v1/pay-runs/${run.body.id}/approve`);
    const p = (await notices(ctx, s.employee, s)).find((x) =>
      x.kind === "payslip-available")!;
    expect(p.body).toBe("Your payslip for 2026-03 is ready in the app.");
    const all = JSON.stringify(await notices(ctx, s.manager, s)) +
      JSON.stringify(await notices(ctx, s.employee, s));
    for (const v of Object.values(SENTINELS)) {
      expect(all).not.toContain(v.salary);
      expect(all).not.toContain(v.gross);
    }
  });
});
