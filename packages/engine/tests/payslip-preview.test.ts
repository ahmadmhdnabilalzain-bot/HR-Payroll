import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAed } from "../src/money";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import { previewPayslipRuleChange } from "../src/payroll/preview";
import { applyRuleChange, previewRuleChange } from "../src/preview";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";
import { PAYROLL_PACKS } from "../src/rules/payroll-pack";
import type { SettlementInput } from "../src/settlement";
import { fx, nationalFx } from "./payroll-fixture";

const code = (c: string) => expect.objectContaining({ code: c });
const uplift = (v: number) =>
  ({ packId: "ae-payroll", key: "overtimeUpliftBps", newValue: v });
const statusIn = (p: { trace: { rules: { key: string;
  status: string }[] }[] }, key: string) =>
  p.trace.flatMap((l) => l.rules).find((r) => r.key === key)?.status;

/** The Plan 1 sample (samples/settlement.json) as a settlement input. */
function plan1Sample(): SettlementInput {
  const path = join(import.meta.dirname, "..", "samples",
    "settlement.json");
  const s = JSON.parse(readFileSync(path, "utf8")) as {
    joiningDate: string; lastWorkingDate: string;
    unpaidLeaveDays: number; basicMonthlyAed: string;
    workerClass: "expat-full-time"; unusedLeaveDays: number };
  return {
    gratuity: { joiningDate: s.joiningDate,
      lastWorkingDate: s.lastWorkingDate,
      unpaidLeaveDays: s.unpaidLeaveDays,
      lastBasicMonthly: parseAed(s.basicMonthlyAed),
      workerClass: s.workerClass },
    unusedLeaveDays: s.unusedLeaveDays,
  };
}

describe("previewRuleChange (settlement) after the refactor", () => {
  it("settlement_preview_unchanged", () => {
    const p = previewRuleChange(plan1Sample(), GRATUITY_PACKS,
      { packId: "ae-gratuity", key: "tier1DaysPerYear", newValue: 22 });
    expect(p).toMatchSnapshot();
  });
});

describe("previewPayslipRuleChange", () => {
  const withOvertime = fx({ overtime: [
    { date: "2026-06-10", minutes: 120, nightMinutes: 0 }] });
  it("identity_change_zero_delta", () => {
    const p = previewPayslipRuleChange(withOvertime,
      DEFAULT_PAYROLL_PACKS, uplift(2500));
    expect(p.hypothetical).toBe(true);
    expect(p.grossDelta).toBe(0n);
    expect(p.netDelta).toBe(0n);
    expect(p.after.value).toEqual(p.before.value);
    expect(statusIn(p.before, "overtimeUpliftBps")).toBe("official");
    expect(statusIn(p.after, "overtimeUpliftBps")).toBe("hypothetical");
  });
  it("overtime_change_moves_gross", () => {
    const change = uplift(5000);
    const p = previewPayslipRuleChange(withOvertime,
      DEFAULT_PAYROLL_PACKS, change);
    const direct = calculatePayslip(withOvertime, { ...DEFAULT_PAYROLL_PACKS,
      payroll: applyRuleChange(PAYROLL_PACKS, change) });
    expect(p.after.value.gross).toBe(direct.value.gross);
    expect(p.grossDelta).toBe(p.after.value.gross - p.before.value.gross);
    expect(p.grossDelta > 0n).toBe(true);
    expect(statusIn(p.after, "overtimeUpliftBps")).toBe("hypothetical");
  });
  it("changes a GPSSA pack param for a national", () => {
    const p = previewPayslipRuleChange(nationalFx(),
      DEFAULT_PAYROLL_PACKS, { packId: "ae-gpssa",
        key: "gpssaDl57EmployeeBps", newValue: 1200 },
      { gpssaContributionSalaryBase: "basic" });
    expect(p.grossDelta).toBe(0n);
    // 1% more of the 10,000.00 basic is deducted: net falls by 100.00.
    expect(p.netDelta).toBe(-10000n);
    expect(statusIn(p.after, "gpssaDl57EmployeeBps"))
      .toBe("hypothetical");
  });
  it("unknown_pack_refused", () => {
    expect(() => previewPayslipRuleChange(withOvertime,
      DEFAULT_PAYROLL_PACKS, { ...uplift(1), packId: "ae-nope" }))
      .toThrow(code("MISSING_PACK"));
  });
  it("unknown key refused", () => {
    expect(() => previewPayslipRuleChange(withOvertime,
      DEFAULT_PAYROLL_PACKS, { ...uplift(1), key: "nope" }))
      .toThrow(code("MISSING_PARAM"));
  });
  it("passes overrides to both sides", () => {
    const p = previewPayslipRuleChange(withOvertime,
      DEFAULT_PAYROLL_PACKS, uplift(5000), { dailyDivisor: 30 });
    const flag = (f: { code: string }) => f.code === "OVERRIDE_USED";
    expect(p.before.value.flags.some(flag)).toBe(true);
    expect(p.after.value.flags.some(flag)).toBe(true);
  });
});

describe("applyRuleChange", () => {
  it("keeps the source packs untouched", () => {
    const changed = applyRuleChange(PAYROLL_PACKS, uplift(5000));
    expect(changed[0]?.params.overtimeUpliftBps?.value).toBe(5000);
    expect(PAYROLL_PACKS[0]?.params.overtimeUpliftBps?.value).toBe(2500);
  });
});
