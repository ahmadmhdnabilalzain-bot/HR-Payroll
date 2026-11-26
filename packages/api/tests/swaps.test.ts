import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, linkUser, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const S = "/v1/time/swaps";

describe("shift swaps", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "swp");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
    // The manager works the 3rd; the report rests that day.
    await as(s.hr, "PUT", "/v1/time/roster", { entries: [{
      employeeId: s.emp.report, date: "2026-03-03",
      slot: { kind: "rest" } }] });
    await as(s.hr, "POST", "/v1/time/roster/publish", { from: "2026-03-03",
      to: "2026-03-03" });
  });
  const ask = (date: string, peerDate?: string) =>
    as(s.employee, "POST", S, { date, withEmployeeId: s.emp.manager,
      ...(peerDate ? { withDate: peerDate } : {}) });
  const slotOf = async (emp: string, date: string) => (await as(s.hr, "GET",
    `/v1/time/roster?from=${date}&to=${date}&employeeId=${emp}`))
    .body.items[0];

  it("swap_happy_path", async () => {
    const v0 = (await slotOf(s.emp.report, "2026-03-03")).version;
    const r = await ask("2026-03-03");
    expect(r.status, r.text).toBe(201);
    expect(r.body.status).toBe("pending-peer");
    const acc = await as(s.manager, "POST", `${S}/${r.body.id}/respond`,
      { accept: true });
    expect(acc.body.status).toBe("pending-approval");
    const ok = await as(s.hr, "POST", `${S}/${r.body.id}/approve`, {});
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.status).toBe("approved");
    const mine = await slotOf(s.emp.report, "2026-03-03");
    const theirs = await slotOf(s.emp.manager, "2026-03-03");
    expect(mine.published.kind).toBe("shift");
    expect(theirs.published.kind).toBe("rest");
    expect(mine.version).toBe(v0 + 1);
    expect(ok.body.requesterSlot.kind).toBe("rest");
    const ev = await ctx.deps.db.query(
      "SELECT 1 FROM audit_events WHERE action = 'swap.approved'");
    expect(ev.length).toBe(1);
  });

  it("swap_peer_only_responds", async () => {
    const r = await ask("2026-03-05");
    const self = await as(s.employee, "POST", `${S}/${r.body.id}/respond`,
      { accept: true });
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe("NOT_SWAP_PARTY");
    await as(s.employee, "POST", `${S}/${r.body.id}/cancel`);
  });

  it("swap_sod", async () => {
    const r = await ask("2026-03-06");
    await as(s.manager, "POST", `${S}/${r.body.id}/respond`,
      { accept: true });
    const own = await as(s.manager, "POST", `${S}/${r.body.id}/approve`, {});
    expect(own.status).toBe(403);
    expect(own.body.error.code).toBe("SOD_VIOLATION");
    const rej = await as(s.hr, "POST", `${S}/${r.body.id}/reject`, {});
    expect(rej.body.status).toBe("rejected");
  });

  it("swap_entry_changed", async () => {
    const r = await ask("2026-03-09");
    await as(s.manager, "POST", `${S}/${r.body.id}/respond`,
      { accept: true });
    await as(s.hr, "PUT", "/v1/time/roster", { entries: [{
      employeeId: s.emp.manager, date: "2026-03-09",
      slot: { kind: "rest" } }] });
    await as(s.hr, "POST", "/v1/time/roster/publish", { from: "2026-03-09",
      to: "2026-03-09", employeeIds: [s.emp.manager] });
    const before = await slotOf(s.emp.report, "2026-03-09");
    const r2 = await as(s.hr, "POST", `${S}/${r.body.id}/approve`, {});
    expect(r2.status).toBe(409);
    expect(r2.body.error.code).toBe("SWAP_ENTRY_CHANGED");
    expect(await slotOf(s.emp.report, "2026-03-09")).toEqual(before);
  });

  it("swap_on_leave_and_past", async () => {
    const lt = await as(s.hr, "POST", "/v1/leave-types", { name: "Type L",
      paid: true, annualDays: null });
    const lr = await as(s.hr, "POST", "/v1/leave-requests", {
      employeeId: s.emp.report, leaveTypeId: lt.body.id,
      startDate: "2026-03-10", endDate: "2026-03-10" });
    await as(s.owner, "POST", `/v1/leave-requests/${lr.body.id}/approve`,
      {});
    const onLeave = await ask("2026-03-10");
    expect(onLeave.status).toBe(422);
    expect(onLeave.body.error.code).toBe("SWAP_ON_LEAVE");
    ctx.clock.now = new Date("2026-03-12T08:00:00.000Z");
    const past = await ask("2026-03-11");
    expect(past.status).toBe(422);
    expect(past.body.error.code).toBe("SWAP_IN_PAST");
    const selfSwap = await as(s.employee, "POST", S, { date: "2026-03-13",
      withEmployeeId: s.emp.report });
    expect(selfSwap.body.error.code).toBe("SWAP_SELF");
  });

  it("swap_visibility", async () => {
    const r = await ask("2026-03-16");
    const outsider = await linkUser(ctx, s, s.emp.outsider, "swpout");
    const list = await as(outsider, "GET", S);
    expect(list.status, list.text).toBe(200);
    expect(list.body.items).toEqual([]);
    const cancel = await as(outsider, "POST", `${S}/${r.body.id}/cancel`);
    expect(cancel.status).toBe(404);
    const respond = await as(outsider, "POST", `${S}/${r.body.id}/respond`,
      { accept: true });
    expect(respond.status).toBe(404);
    const hr = await as(s.hr, "GET", S);
    expect(hr.body.items.map((x: { id: string }) => x.id))
      .toContain(r.body.id);
  });
});
