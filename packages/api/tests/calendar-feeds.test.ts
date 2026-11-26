import { describe, expect, it } from "vitest";
import { FAKE_API_BASE } from "./helpers/fake-channels";
import {
  SENTINELS,
  seedCompany,
  type Seeded,
  type SeedUser,
} from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

const create = (ctx: Ctx, u: SeedUser, s: Seeded, scope: string) =>
  call(ctx.app, u.token, s.companyId, "POST", "/v1/me/calendar-feeds",
    { scope });
const fetchFeed = (ctx: Ctx, url: string) =>
  ctx.app.request(url.slice(FAKE_API_BASE.length));

async function leave(ctx: Ctx, s: Seeded, type: string) {
  const lt = await call(ctx.app, s.hr.token, s.companyId, "POST",
    "/v1/leave-types", { name: type, paid: true, annualDays: 30 });
  const r = await call(ctx.app, s.employee.token, s.companyId, "POST",
    "/v1/leave-requests", { leaveTypeId: lt.body.id,
      startDate: "2026-03-10", endDate: "2026-03-11" });
  await call(ctx.app, s.manager.token, s.companyId, "POST",
    `/v1/leave-requests/${r.body.id}/approve`, {});
}

describe("calendar feeds", () => {
  it("feed_create_and_fetch, feed_audit and push adapters", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "cfa");
    await leave(ctx, s, "Annual");
    const f = await create(ctx, s.employee, s, "my");
    expect(f.status, f.text).toBe(201);
    expect(f.body.url.startsWith(`${FAKE_API_BASE}/v1/calendar/cal1.`))
      .toBe(true);
    const r = await fetchFeed(ctx, f.body.url);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/calendar");
    expect(r.headers.get("cache-control")).toBe("private, max-age=900");
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await r.text()).toContain("SUMMARY:Leave: Annual");
    const audit = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/audit-events?limit=200");
    const ev = audit.body.items.find((e: { action: string }) =>
      e.action === "calendar.feed-created");
    expect(ev.data).toEqual({ scope: "my" });
    expect(audit.text).not.toContain("cal1.");
    for (const p of ctx.deps.channels.calendarPush) {
      expect(p.configured).toBe(false);
      expect(await p.removeEvent("x")).toEqual({ status: "not-configured" });
    }
  });

  it("feed_scope_by_role", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "cfb");
    await leave(ctx, s, "Sick");
    expect((await create(ctx, s.employee, s, "team")).status).toBe(403);
    const team = await create(ctx, s.manager, s, "team");
    const text = await (await fetchFeed(ctx, team.body.url)).text();
    expect(text).toContain("SUMMARY:Away: Person 2");
    expect(text).not.toContain("Sick");
    expect((await create(ctx, s.hr, s, "company-deadlines")).status)
      .toBe(201);
    expect((await create(ctx, s.manager, s, "company-deadlines")).status)
      .toBe(403);
  });

  it("feed_revoked_or_wrong and feed_limit", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "cfc");
    const f = await create(ctx, s.employee, s, "my");
    const bad = f.body.url.replace(/(.)\.ics$/, (_: string, c: string) =>
      `${c === "A" ? "B" : "A"}.ics`);
    const wrong = await fetchFeed(ctx, bad);
    expect(wrong.status).toBe(404);
    const wrongBody = JSON.parse(await wrong.text()).error;
    await call(ctx.app, s.employee.token, s.companyId, "POST",
      `/v1/me/calendar-feeds/${f.body.id}/revoke`);
    const gone = await fetchFeed(ctx, f.body.url);
    expect(gone.status).toBe(404);
    const goneBody = JSON.parse(await gone.text()).error;
    expect([goneBody.code, goneBody.message]).toEqual(
      [wrongBody.code, wrongBody.message]);
    const team = await create(ctx, s.manager, s, "team");
    await call(ctx.app, s.owner.token, s.companyId, "PATCH",
      `/v1/users/${s.manager.userId}`, { role: "employee" });
    expect((await fetchFeed(ctx, team.body.url)).status).toBe(404);
    for (let i = 0; i < 5; i++) {
      expect((await create(ctx, s.hr, s, "my")).status).toBe(201);
    }
    const sixth = await create(ctx, s.hr, s, "my");
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe("FEED_LIMIT");
  });

  it("feed_no_sentinels", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "cfd");
    await leave(ctx, s, "Annual");
    const f = await create(ctx, s.hr, s, "team");
    const text = await (await fetchFeed(ctx, f.body.url)).text();
    expect(text).toContain("Away: Person 2");
    for (const v of Object.values(SENTINELS)) {
      for (const x of [v.salary, v.iban, v.labour, v.eid]) {
        expect(text).not.toContain(x);
      }
    }
    expect(/\d{14}/.test(text)).toBe(false);
  });
});
