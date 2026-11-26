import { addDays } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { computeAttendanceFlags, type FlagDay } from "../src/time/flags";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, linkUser, seedTime } from "./helpers/seed-time";
import { makeApp } from "./helpers/test-app";

const E = "00000000-0000-4000-8000-0000000000e1";
const T = { graceMinutes: 5, lateFlagThreshold: 3,
  restAdjacentAbsenceThreshold: 2, shortSickSpellThreshold: 3 };
const W = { from: "2026-03-01", to: "2026-03-31" };
const RULE = { key: "timeOvertimeMaxMinutesPerDay", value: "120",
  status: "official" as const, packId: "ae-time", packVersion: "2022-02-02",
  overridden: false };

function day(date: string, o: Partial<FlagDay> = {}): FlagDay {
  return { date, kind: "work", hasPublishedShift: true, lateMinutes: 0,
    earlyLeaveMinutes: 0, worked: true, openRecord: false, leave: "none",
    sickLeave: false, restOrHolidayNext: false, restOrHolidayPrev: false,
    geofenceException: false, sheetFlags: [], ...o };
}
const codes = (days: FlagDay[]) =>
  computeAttendanceFlags(E, days, T, W).map((f) => f.code);

describe("attendance flags (pure)", () => {
  it("late_uses_grace", () => {
    expect(codes([day("2026-03-02", { lateMinutes: 5 })])).toEqual([]);
    const [f] = computeAttendanceFlags(E, [day("2026-03-02",
      { lateMinutes: 6 })], T, W);
    expect(f).toMatchObject({ code: "LATE_ARRIVAL", basis: "record",
      inputs: { lateMinutes: "6" }, consequence: "none" });
  });

  it("repeated_lateness_threshold", () => {
    const late = ["2026-03-10", "2026-03-12", "2026-03-20"].map((d) =>
      day(d, { lateMinutes: 10 }));
    const f = computeAttendanceFlags(E, late, T, W)
      .find((x) => x.code === "REPEATED_LATENESS");
    expect(f?.dates).toEqual(["2026-03-10", "2026-03-12", "2026-03-20"]);
    expect(f?.basis).toBe("product-threshold");
    expect(codes(late.slice(0, 2))).not.toContain("REPEATED_LATENESS");
  });

  it("absence_next_to_rest_day", () => {
    const days = [day("2026-03-05", { worked: false,
      restOrHolidayNext: true }), day("2026-03-12", { worked: false,
      restOrHolidayPrev: true })];
    expect(codes(days)).toContain("ABSENCE_NEXT_TO_REST_DAY");
    expect(codes(days.slice(0, 1))).not.toContain(
      "ABSENCE_NEXT_TO_REST_DAY");
  });

  it("short_sick_spells", () => {
    const sick = (d: string) => day(d, { worked: false, leave: "full",
      sickLeave: true });
    expect(codes([sick("2026-03-02"), sick("2026-03-09"),
      sick("2026-03-16")])).toContain("FREQUENT_SHORT_SICK_LEAVE");
    const long = Array.from({ length: 5 }, (_, i) =>
      sick(addDays("2026-03-02", i)));
    expect(codes(long)).not.toContain("FREQUENT_SHORT_SICK_LEAVE");
  });

  it("unrecorded_absence_only_with_shift", () => {
    expect(codes([day("2026-03-02", { worked: false })]))
      .toEqual(["UNRECORDED_ABSENCE"]);
    expect(codes([day("2026-03-02", { worked: false,
      hasPublishedShift: false })])).toEqual([]);
  });

  it("flags_have_no_consequence", () => {
    const all = computeAttendanceFlags(E, [
      day("2026-03-02", { lateMinutes: 9, earlyLeaveMinutes: 9 }),
      day("2026-03-03", { openRecord: true, geofenceException: true }),
      day("2026-03-04", { worked: false })], T, W);
    expect(all.length).toBeGreaterThan(3);
    for (const f of all) {
      expect(f.consequence).toBe("none");
      expect(f.dates.length).toBeGreaterThan(0);
    }
  });

  it("law_flags_carry_rule", () => {
    const [f] = computeAttendanceFlags(E, [day("2026-03-02", {
      sheetFlags: [{ code: "OVERTIME_DAILY_CAP_EXCEEDED",
        dates: ["2026-03-02"], detail: { minutes: "180" }, rule: RULE }] })],
    T, W);
    expect(f).toMatchObject({ code: "OVERTIME_DAILY_CAP_EXCEEDED",
      basis: "law", rule: { key: "timeOvertimeMaxMinutesPerDay" } });
  });
});

describe("flags routes", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-03-10T04:00:00.000Z" });
    s = await seedCompany(ctx, "flg");
    await seedTime(ctx, s);
  });
  it("flags_visibility", async () => {
    const as = asUser(ctx, s);
    const q = `/v1/time/flags?from=2026-03-01&to=2026-03-09&employeeId=${
      s.emp.report}`;
    const peer = await linkUser(ctx, s, s.emp.outsider, "flgpeer");
    expect((await as(peer, "GET", q)).status).toBe(404);
    const own = await as(s.employee, "GET", q);
    expect(own.status, own.text).toBe(200);
    expect(own.body.items.map((f: { code: string }) => f.code))
      .toContain("UNRECORDED_ABSENCE");
    expect((await as(s.manager, "GET", q)).status).toBe(200);
  });
});
