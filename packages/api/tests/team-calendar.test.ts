import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import {
  asUser,
  linkUser,
  SICK_SENTINEL,
  seedTime,
  type TimeSeed,
} from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const C = "/v1/time/calendar?from=2026-03-16&to=2026-03-22";

describe("team calendar", () => {
  let ctx: Ctx;
  let s: Seeded;
  let t: TimeSeed;
  let as: ReturnType<typeof asUser>;
  let peer: SeedUser;
  const entryOf = async (who: SeedUser, date: string) => {
    const r = await as(who, "GET", C);
    const d = r.body.items.find((x: { date: string }) => x.date === date);
    return { text: r.text, e: d?.entries.find((x: { employeeId: string }) =>
      x.employeeId === s.emp.report) };
  };
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "tcal");
    t = await seedTime(ctx, s);
    as = asUser(ctx, s);
    // All four seeded employees share one department.
    const d = await as(s.hr, "POST", "/v1/departments", { name: "Ops" });
    for (const e of Object.values(s.emp)) {
      await as(s.hr, "PATCH", `/v1/employees/${e}`,
        { departmentId: d.body.id });
    }
    peer = await linkUser(ctx, s, s.emp.report2, "tcalpeer");
    const sick = await as(s.hr, "POST", "/v1/leave-requests", { employeeId:
      s.emp.report, leaveTypeId: t.sickTypeId, startDate: "2026-03-17",
      endDate: "2026-03-17" });
    await as(s.owner, "POST", `/v1/leave-requests/${sick.body.id}/approve`,
      {});
    const ann = await as(s.hr, "POST", "/v1/leave-requests", { employeeId:
      s.emp.report, leaveTypeId: t.annualTypeId, startDate: "2026-03-19",
      endDate: "2026-03-19" });
    await as(s.owner, "POST", `/v1/leave-requests/${ann.body.id}/approve`,
      {});
    await as(s.employee, "POST", "/v1/leave-requests", { leaveTypeId:
      t.annualTypeId, startDate: "2026-03-22", endDate: "2026-03-22" });
  });

  it("calendar_hides_health_type_from_peer", async () => {
    const p = await entryOf(peer, "2026-03-17");
    expect(p.e).toMatchObject({ kind: "leave", leave: { typeName: null } });
    expect(p.text).not.toContain(SICK_SENTINEL);
    for (const who of [s.manager, s.hr, s.employee]) {
      expect((await entryOf(who, "2026-03-17")).e.leave.typeName)
        .toBe(SICK_SENTINEL);
    }
    expect((await entryOf(peer, "2026-03-19")).e.leave.typeName).toBeNull();
  });

  it("pending_hidden_from_peers", async () => {
    expect((await entryOf(peer, "2026-03-22")).e?.kind).not.toBe("leave");
    expect((await entryOf(s.manager, "2026-03-22")).e.leave.status)
      .toBe("pending");
  });

  it("calendar_marks_holiday_and_rest", async () => {
    const r = await as(s.employee, "GET", C);
    const hol = r.body.items.filter((d: { holiday: unknown }) =>
      d.holiday !== null).map((d: { date: string }) => d.date);
    expect(hol).toEqual(["2026-03-20"]);
    const wed = r.body.items.find((d: { date: string }) =>
      d.date === "2026-03-18");
    expect(wed.companyRestDay).toBe(true);
  });

  it("calendar_range_limit", async () => {
    const r = await as(s.hr, "GET",
      "/v1/time/calendar?from=2026-01-01&to=2026-03-04");
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("RANGE_TOO_LONG");
  });
});
