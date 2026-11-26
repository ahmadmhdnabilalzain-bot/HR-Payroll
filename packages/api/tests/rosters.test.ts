import { loadTimeParams, TIME_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime, type TimeSeed } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const R = "/v1/time/roster";

describe("shifts and rosters", () => {
  let ctx: Ctx;
  let s: Seeded;
  let t: TimeSeed;
  let as: ReturnType<typeof asUser>;
  const shift = (id: string) => ({ kind: "shift", shiftTemplateId: id });
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "ros");
    t = await seedTime(ctx, s);
    as = asUser(ctx, s);
  });

  it("template_derives_net_and_midnight", async () => {
    const r = await as(s.hr, "POST", "/v1/time/shifts", { name: "Night",
      start: "22:00", end: "06:00", breakMinutes: 30 });
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ crossesMidnight: true, netMinutes: 450 });
    const same = await as(s.hr, "POST", "/v1/time/shifts", { name: "X",
      start: "09:00", end: "09:00", breakMinutes: 0 });
    expect(same.status).toBe(400);
    const longBreak = await as(s.hr, "POST", "/v1/time/shifts", {
      name: "Y", start: "09:00", end: "10:00", breakMinutes: 60 });
    expect(longBreak.status).toBe(400);
    const patch = await as(s.hr, "PATCH", `/v1/time/shifts/${r.body.id}`,
      { end: "22:20" });
    expect(patch.status).toBe(400);
  });

  it("manager_writes_reports_only", async () => {
    const before = await as(s.hr, "GET",
      `${R}?from=2026-04-01&to=2026-04-02`);
    const r = await as(s.manager, "PUT", R, { entries: [
      { employeeId: s.emp.report, date: "2026-04-01", slot: { kind: "rest" } },
      { employeeId: s.emp.outsider, date: "2026-04-01",
        slot: { kind: "rest" } }] });
    expect(r.status).toBe(404);
    const after = await as(s.hr, "GET", `${R}?from=2026-04-01&to=2026-04-02`);
    expect(after.body).toEqual(before.body);
  });

  it("employee_sees_published_only", async () => {
    const put = await as(s.hr, "PUT", R, { entries: [{ employeeId:
      s.emp.report, date: "2026-03-02", slot: { kind: "rest" } }] });
    expect(put.status, put.text).toBe(200);
    const mine = await as(s.employee, "GET",
      `${R}?from=2026-03-02&to=2026-03-02&employeeId=${s.emp.report}`);
    expect(mine.body.items[0]).toMatchObject({ draft: null,
      published: { kind: "shift", start: "09:00" } });
    const hr = await as(s.hr, "GET",
      `${R}?from=2026-03-02&to=2026-03-02&employeeId=${s.emp.report}`);
    expect(hr.body.items[0]).toMatchObject({ draft: { kind: "rest" },
      changedSincePublish: true });
  });

  it("publish_snapshots_times", async () => {
    const tpl = await as(s.hr, "POST", "/v1/time/shifts", { name: "Shift B",
      start: "09:00", end: "17:00", breakMinutes: 60 });
    const day = { employeeId: s.emp.report, date: "2026-04-06" };
    await as(s.hr, "PUT", R, { entries: [{ ...day,
      slot: shift(tpl.body.id) }] });
    const pub = await as(s.hr, "POST", `${R}/publish`, { from: "2026-04-06",
      to: "2026-04-06", employeeIds: [s.emp.report] });
    expect(pub.status, pub.text).toBe(200);
    expect(pub.body.published).toBe(1);
    await as(s.hr, "PATCH", `/v1/time/shifts/${tpl.body.id}`,
      { end: "18:00" });
    const g = await as(s.hr, "GET",
      `${R}?from=2026-04-06&to=2026-04-06&employeeId=${s.emp.report}`);
    expect(g.body.items[0].published.end).toBe("17:00");
    expect(g.body.items[0].draft.end).toBe("18:00");
    expect(g.body.items[0].version).toBe(1);
  });

  it("rotation_cycles_pattern", async () => {
    const r = await as(s.manager, "POST", `${R}/rotation`, {
      employeeIds: [s.emp.report], from: "2026-05-04", to: "2026-05-10",
      pattern: [t.shiftId, t.shiftId, null] });
    expect(r.status, r.text).toBe(200);
    const kinds = r.body.days.map((d: { draft: { kind: string } }) =>
      d.draft.kind);
    expect(kinds).toEqual(["shift", "shift", "rest", "shift", "shift",
      "rest", "shift"]);
  });

  it("roster_flags_returned_not_blocking", async () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      employeeId: s.emp.report2, date: `2026-06-0${i + 1}`,
      slot: shift(t.shiftId) }));
    const r = await as(s.hr, "PUT", R, { entries });
    expect(r.status, r.text).toBe(200);
    const f = r.body.flags.find((x: { code: string }) =>
      x.code === "NO_WEEKLY_REST");
    expect(f.employeeId).toBe(s.emp.report2);
    const p = loadTimeParams(TIME_PACKS[0]!, undefined);
    expect(f.rule.status).toBe(p.minWeeklyRestDays.rule.status);
  });

  it("roster_range_limit", async () => {
    const r = await as(s.hr, "GET", `${R}?from=2026-01-01&to=2026-03-04`);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("RANGE_TOO_LONG");
  });

  it("retired_template_refused", async () => {
    const tpl = await as(s.hr, "POST", "/v1/time/shifts", { name: "Old",
      start: "08:00", end: "12:00", breakMinutes: 0 });
    await as(s.hr, "PATCH", `/v1/time/shifts/${tpl.body.id}`,
      { status: "retired" });
    const r = await as(s.hr, "PUT", R, { entries: [{ employeeId:
      s.emp.report, date: "2026-07-01", slot: shift(tpl.body.id) }] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("SHIFT_RETIRED");
  });
});
