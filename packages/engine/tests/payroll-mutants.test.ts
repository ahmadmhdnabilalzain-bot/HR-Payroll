import { describe, expect, it } from "vitest";
import { fils } from "../src/money";
import { applyDeductions } from "../src/payroll/deductions";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import type { GpssaRegime } from "../src/payroll/params";
import type { PayslipInput } from "../src/payroll/types";
import { validatePayslipInput } from "../src/payroll/validate";
import { variableEarnings } from "../src/payroll/variable";
import { TraceBuilder } from "../src/trace";
import { codeOf, detailOf, fx, nationalFx, P } from "./payroll-fixture";

/** Tests that pin values the first suite let mutate unnoticed (I4). */
describe("review mutants", () => {
  it("caps court debt at a quarter of the wage", () => {
    const r = applyDeductions({ earnedWage: fils(1500000n),
      contractualWage: fils(1500000n), gpssaShare: null, loans: [],
      requests: [{ ref: "C1", kind: "court-debt", amount: fils(400000n),
        consentOnFile: true }] }, P, new TraceBuilder());
    expect(r.lines.map((l) => l.amount)).toEqual([375000n]);
    expect(r.deferred).toMatchObject([{ deferred: 25000n,
      reason: "kind-cap" }]);
  });
  it("flags overtime from the 121st minute", () => {
    const flags = (minutes: number) => variableEarnings(fx({ overtime: [
      { date: "2026-06-10", minutes, nightMinutes: 0 }] }), P,
    new TraceBuilder()).flags.map((f) => f.code);
    expect(flags(120)).toEqual([]);
    expect(flags(121)).toEqual(["OVERTIME_DAILY_CAP_EXCEEDED"]);
  });
  it("refuses an absence after the leaving date", () => {
    const i = fx({ employee: { leavingDate: "2026-06-15" },
      absences: [{ date: "2026-06-20", kind: "unpaid" }] });
    const fn = () => validatePayslipInput(i, P);
    expect(codeOf(fn)).toBe("DATE_OUTSIDE_PAY_PERIOD");
    expect(detailOf(fn).value).toBe("2026-06-20");
  });
});

describe("employer GPSSA share rounded once (M2)", () => {
  const slip = (regime: GpssaRegime) => calculatePayslip(nationalFx({},
    { regime, fixingBasic: fils(300100n) }), DEFAULT_PAYROLL_PACKS,
  { gpssaContributionSalaryBase: "basic" });
  it.each(["dl57-2023", "law7-1999"] as const)("%s", (regime) => {
    const { value, trace } = slip(regime);
    const result = (id: string) => trace.find((l) => l.id === id)?.result;
    expect(result("gpssa.employer-gross")).toBe("45015");
    // 300,100 * 12.5% = 37,512.5 -> 37,513 (HALF_UP, once).
    expect(value.employerCost).toBe(37513n);
    expect(result("gpssa.gov-support")).toBe("7502");
  });
});

describe("night minutes fit the 22:00-04:00 window (M12)", () => {
  const night = (n: number): PayslipInput => fx({ overtime: [
    { date: "2026-06-10", minutes: 600, nightMinutes: n }] });
  it("accepts 360 night minutes and refuses 361", () => {
    expect(validatePayslipInput(night(360), P).payEnd).toBe("2026-06-30");
    const fn = () => validatePayslipInput(night(361), P);
    expect(codeOf(fn)).toBe("INVALID_MINUTES");
    expect(detailOf(fn).value).toBe("361");
  });
});
