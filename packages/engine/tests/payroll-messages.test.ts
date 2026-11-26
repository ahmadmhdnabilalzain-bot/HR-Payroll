import { describe, expect, it } from "vitest";
import { explainTrace } from "../src/explain/explain";
import { PAYROLL_AR } from "../src/explain/payroll-catalog";
import { fils } from "../src/money";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import type { PayslipInput } from "../src/payroll/types";
import type { ParamValue } from "../src/rules/types";
import { absent, dates, fx, nationalFx } from "./payroll-fixture";

const run = (i: PayslipInput, ov?: Record<string, ParamValue>) =>
  calculatePayslip(i, DEFAULT_PAYROLL_PACKS, ov);
const WAGE = { gpssaContributionSalaryBase: "wage" };
const codes = (i: PayslipInput, ov?: Record<string, ParamValue>) =>
  run(i, ov).value.flags.map((f) => f.code);
const explain = (i: PayslipInput, id: string, lang: "en" | "ar" = "en",
  ov?: Record<string, ParamValue>) =>
  explainTrace(run(i, ov).trace.filter((l) => l.id === id), lang);

describe("deferrals in a leaving month (I3)", () => {
  it("says a leaver's remainder must be settled at exit", () => {
    const leaver = nationalFx({ employee: { leavingDate: "2026-06-01" } });
    const s = run(leaver, WAGE).value;
    expect(s.deferred[0]?.deferred).toBe(140001n);
    expect(codes(leaver, WAGE)).toContain("DEDUCTION_DUE_AT_EXIT");
    expect(codes(leaver, WAGE)).not.toContain("DEDUCTION_DEFERRED");
    const f = s.flags.find((x) => x.code === "DEDUCTION_DUE_AT_EXIT");
    expect(f?.message).toContain("must be settled at exit");
    expect(f?.message).not.toContain("later month");
  });
  it("does the same for a leaver's loan", () => {
    const i = fx({ employee: { leavingDate: "2026-06-01" },
      loans: [{ ref: "L1", instalment: fils(100000n),
        balance: fils(500000n), consentOnFile: true }] });
    expect(codes(i)).toEqual(["DEDUCTION_DUE_AT_EXIT"]);
  });
  it("keeps 'a later month' while the worker stays", () => {
    const i = fx({ deductions: [{ ref: "O1", kind: "overpayment",
      amount: fils(400000n), consentOnFile: true }] });
    expect(codes(i)).toEqual(["DEDUCTION_DEFERRED"]);
  });
});

describe("message text (M3, M7)", () => {
  it("prints the cap rate instead of 'half'", () => {
    expect(explain(fx(), "cap.overall"))
      .toContain("(50% of the wage): AED 7,500.00");
    expect(explain(fx(), "cap.overall", "en",
      { deductionOverallCapBps: 4050 }))
      .toContain("(40.5% of the wage): AED 6,075.00");
    expect(explain(fx(), "cap.overall")).not.toContain("half");
  });
  it("cites DL57 only under DL57 for a deferred share", () => {
    const join = { employee: { joiningDate: "2026-06-30" } };
    const dl = run(nationalFx(join, { fixingMonth: "2026-06" }), WAGE);
    const l7 = run(nationalFx(join, { fixingMonth: "2026-06",
      regime: "law7-1999" }), WAGE);
    const msg = (r: typeof dl) => r.value.flags.find((f) =>
      f.code === "GPSSA_SHARE_DEFERRED")?.message ?? "";
    expect(msg(dl)).toContain("DL57 Art 11(4)");
    expect(msg(l7)).not.toContain("DL57");
    expect(msg(l7)).toContain("Law 7");
  });
  it("shows probation days and days beyond the limit on sick leave", () => {
    const i = fx({ sickDaysUsedBefore: 89,
      employee: { probationEndDate: "2026-06-02" },
      absences: absent("sick", dates("2026-06", 1, 4)) });
    const en = explain(i, "leave.sick");
    expect(en).toContain("1 unpaid, 1 unpaid beyond the legal limit, " +
      "2 unpaid in probation");
    expect(explain(i, "leave.sick", "ar")).toContain("2");
  });
  it("shows days beyond the limit on maternity leave", () => {
    const i = fx({ maternityDaysUsedBefore: 100,
      absences: absent("maternity", dates("2026-06", 1, 10)) });
    expect(explain(i, "leave.maternity"))
      .toContain("5 unpaid, 5 unpaid beyond the legal limit");
  });
  it("words the Arabic cap base without an approval root", () => {
    expect(PAYROLL_AR["cap.base"]).not.toContain("المعتمد");
    expect(PAYROLL_AR["cap.overall"]).not.toContain("نصف");
  });
});
