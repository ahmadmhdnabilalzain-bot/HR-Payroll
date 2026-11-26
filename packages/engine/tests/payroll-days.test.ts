import { describe, expect, it } from "vitest";
import { accountDays } from "../src/payroll/days";
import { validatePayslipInput } from "../src/payroll/validate";
import { TraceBuilder } from "../src/trace";
import {
  absent,
  dates,
  fx,
  P,
  type FxPatch,
} from "./payroll-fixture";

function account(patch: FxPatch) {
  const input = fx(patch);
  const t = new TraceBuilder();
  const d = accountDays(input, validatePayslipInput(input, P), P, t);
  return { input, d, t };
}

describe("accountDays", () => {
  it("counts a full month", () => {
    const { d } = account({});
    expect(d).toMatchObject({ employedDays: 30, unpaidDays: 0,
      halfPayDays: 0, paidHalfDays: 60n, totalHalfDays: 60n, sick: null,
      maternity: null, flags: [] });
  });
  it("takes out three unpaid days", () => {
    const { d } = account({ absences: absent("unpaid",
      dates("2026-06", 2, 4)) });
    expect(d.unpaidDays).toBe(3);
    expect(d.paidHalfDays).toBe(54n);
  });
  it("pays nothing for a whole unpaid month", () => {
    const { d } = account({ absences: absent("unpaid",
      dates("2026-06", 1, 30)) });
    expect(d.unpaidDays).toBe(30);
    expect(d.paidHalfDays).toBe(0n);
  });
  it("steps sick pay from full to half", () => {
    const { d } = account({ sickDaysUsedBefore: 10,
      absences: absent("sick", dates("2026-06", 1, 10)) });
    expect(d.sick).toEqual({ fullPay: 5, halfPay: 5, unpaid: 0, beyond: 0,
      probation: 0, usedAfter: 20 });
    expect(d.paidHalfDays).toBe(55n);
  });
  it("crosses 45 sick days", () => {
    const { d } = account({ sickDaysUsedBefore: 40,
      absences: absent("sick", dates("2026-06", 1, 20)) });
    expect(d.sick).toMatchObject({ halfPay: 5, unpaid: 15, usedAfter: 60 });
    expect(d.paidHalfDays).toBe(25n);
  });
  it("crosses 90 sick days and flags it", () => {
    const { d } = account({ sickDaysUsedBefore: 80,
      absences: absent("sick", dates("2026-06", 1, 15)) });
    expect(d.sick).toMatchObject({ unpaid: 10, beyond: 5 });
    expect(d.unpaidDays).toBe(15);
    expect(d.paidHalfDays).toBe(30n);
    expect(d.flags.map((f) => f.code)).toEqual(["SICK_LEAVE_OVER_MAX"]);
  });
  it("ends probation mid-month", () => {
    const { d } = account({ employee: { probationEndDate: "2026-06-10" },
      absences: absent("sick", dates("2026-06", 9, 12)) });
    expect(d.sick).toMatchObject({ probation: 2, fullPay: 2,
      usedAfter: 2 });
    expect(d.unpaidDays).toBe(2);
    expect(d.paidHalfDays).toBe(56n);
  });
  it("steps maternity from half to unpaid", () => {
    const { d } = account({ maternityDaysUsedBefore: 55,
      absences: absent("maternity", dates("2026-06", 1, 10)) });
    expect(d.maternity).toMatchObject({ halfPay: 5, unpaid: 5 });
    expect(d.unpaidDays).toBe(5);
    expect(d.paidHalfDays).toBe(45n);
  });
  it("flags maternity beyond 105 days", () => {
    const { d } = account({ maternityDaysUsedBefore: 100,
      absences: absent("maternity", dates("2026-06", 1, 10)) });
    expect(d.maternity).toMatchObject({ unpaid: 5, beyond: 5,
      usedAfter: 110 });
    expect(d.flags.map((f) => f.code)).toEqual(
      ["MATERNITY_LEAVE_OVER_MAX"]);
  });
  it("takes sick days in date order", () => {
    const ds = dates("2026-06", 1, 10).reverse();
    const { d } = account({ sickDaysUsedBefore: 10,
      employee: { probationEndDate: "2026-06-02" },
      absences: absent("sick", ds) });
    expect(d.sick).toMatchObject({ probation: 2, fullPay: 5, halfPay: 3 });
  });
  it("traces the day count", () => {
    const { t } = account({ sickDaysUsedBefore: 10,
      absences: absent("sick", dates("2026-06", 1, 10)) });
    const byId = new Map(t.lines().map((l) => [l.id, l]));
    expect(byId.get("payroll.period")?.result).toBe("30");
    expect(byId.get("payroll.period")?.inputs).toMatchObject({
      payStart: "2026-06-01", payEnd: "2026-06-30", daysInMonth: "30" });
    expect(byId.get("payroll.days")?.result).toBe("55/60");
    expect(byId.get("payroll.days")?.inputs).toMatchObject({
      unpaidDays: "0", halfPayDays: "5", employedDays: "30" });
    expect(byId.get("leave.sick")?.inputs).toMatchObject({
      fullPay: "5", halfPay: "5", unpaid: "0", usedBefore: "10" });
    expect(byId.get("leave.sick")?.result).toBe("20");
    expect(byId.has("leave.maternity")).toBe(false);
  });
});
