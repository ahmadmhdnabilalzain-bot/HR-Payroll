import { describe, expect, it } from "vitest";
import { explainTrace } from "../src/explain/explain";
import { fils } from "../src/money";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import type { PayslipInput } from "../src/payroll/types";
import type { ParamValue } from "../src/rules/types";
import { codeOf, detailOf, fx, nationalFx } from "./payroll-fixture";

const run = (i: PayslipInput, ov?: Record<string, ParamValue>) =>
  calculatePayslip(i, DEFAULT_PAYROLL_PACKS, ov);
const WAGE = { gpssaContributionSalaryBase: "wage" };
const flag = (i: PayslipInput, ov: Record<string, ParamValue>,
  code: string) => run(i, ov).value.flags.find((f) => f.code === code);
const usedKeys = (i: PayslipInput, ov: Record<string, ParamValue>) =>
  flag(i, ov, "OVERRIDE_USED")?.detail["keys"];

describe("GPSSA employee share trace (I1)", () => {
  it("traces the employee share with its rate and salary-base rules", () => {
    const { trace } = run(nationalFx({}, { arrears: fils(200000n) }), WAGE);
    const share = trace.find((l) => l.id === "gpssa.employee-share");
    expect(share?.result).toBe("165000");
    const keys = share?.rules.map((r) => r.key) ?? [];
    expect(keys).toContain("gpssaDl57EmployeeBps");
    expect(keys).toContain("gpssaContributionSalaryBase");
    const ded = trace.find((l) => l.id === "ded.gpssa");
    expect(ded?.inputs).toMatchObject({ share: "165000",
      arrears: "200000", requested: "365000" });
    expect(ded?.rules.map((r) => r.key))
      .toContain("gpssaContributionSalaryBase");
    const employer = trace.find((l) => l.id === "employer.gpssa");
    expect(employer?.rules.map((r) => r.key))
      .toContain("gpssaContributionSalaryBase");
  });
  it("flags an overridden employee rate in both regimes", () => {
    expect(usedKeys(nationalFx(), { ...WAGE, gpssaDl57EmployeeBps: 0 }))
      .toBe("gpssaContributionSalaryBase,gpssaDl57EmployeeBps");
    expect(usedKeys(nationalFx({}, { regime: "law7-1999" }),
      { ...WAGE, gpssaL7EmployeeBps: 600 }))
      .toBe("gpssaContributionSalaryBase,gpssaL7EmployeeBps");
  });
  it("explains overridden rules as overridden, not official", () => {
    const { trace } = run(nationalFx(), WAGE);
    const line = trace.filter((l) => l.id === "ded.gpssa");
    expect(explainTrace(line, "en")).toContain("overridden");
    const ot = run(fx({ overtime: [{ date: "2026-06-10", minutes: 60,
      nightMinutes: 0 }] }), { overtimeUpliftBps: 3000 }).trace
      .filter((l) => l.id === "earn.overtime.normal");
    expect(explainTrace(ot, "en")).toMatch(/\(overridden, /);
    expect(explainTrace(ot, "ar")).toContain("قيمة مستبدلة");
  });
});

describe("overrides recorded when params load (I2, M8)", () => {
  it("flags maxNormalHoursPerDay read only in validation", () => {
    const i = fx({ employee: { normalHoursPerDay: 12 }, overtime: [
      { date: "2026-06-10", minutes: 120, nightMinutes: 0 }] });
    expect(codeOf(() => run(i))).toBe("INVALID_HOURS");
    expect(usedKeys(i, { maxNormalHoursPerDay: 12 }))
      .toBe("maxNormalHoursPerDay");
  });
  it("flags overtimeMaxMinutesPerDay on a night-only month", () => {
    const i = fx({ overtime: [{ date: "2026-06-10", minutes: 180,
      nightMinutes: 180 }] });
    expect(usedKeys(i, { overtimeMaxMinutesPerDay: 600 }))
      .toBe("overtimeMaxMinutesPerDay");
    const night = run(i).trace.find((l) => l.id === "earn.overtime.night");
    const keys = night?.rules.map((r) => r.key) ?? [];
    expect(keys).toContain("overtimeMaxMinutesPerDay");
    expect(keys).toContain("maxNormalHoursPerDay");
  });
  it("flags a key that is never traced", () => {
    expect(usedKeys(fx(), { maxHoursPer3Weeks: 100 }))
      .toBe("maxHoursPer3Weeks");
  });
  it("refuses an override key no pack defines", () => {
    const fn = () => run(fx(), { overtimeUpliftBsp: 9999 });
    expect(codeOf(fn)).toBe("UNKNOWN_OVERRIDE");
    expect(detailOf(fn).key).toBe("overtimeUpliftBsp");
  });
  it("shows a known key this payslip did not use", () => {
    const f = flag(fx(), WAGE, "OVERRIDE_UNUSED");
    expect(f?.detail["keys"]).toBe("gpssaContributionSalaryBase");
    expect(flag(fx(), WAGE, "OVERRIDE_USED")).toBeUndefined();
  });
});
