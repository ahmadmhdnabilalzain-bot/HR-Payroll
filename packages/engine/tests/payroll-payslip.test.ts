import { describe, expect, it } from "vitest";
import { fils } from "../src/money";
import { NOT_COMPUTED, notApplicableFor } from "../src/payroll/not-computed";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import type { PayslipInput } from "../src/payroll/types";
import type { ParamValue } from "../src/rules/types";
import {
  codeOf,
  expectTraced,
  fx,
  nationalFx,
} from "./payroll-fixture";

const run = (i: PayslipInput, ov?: Record<string, ParamValue>) =>
  calculatePayslip(i, DEFAULT_PAYROLL_PACKS, ov);
const WAGE = { gpssaContributionSalaryBase: "wage" };
const OT = fx({ overtime: [
  { date: "2026-06-10", minutes: 120, nightMinutes: 0 },
  { date: "2026-06-11", minutes: 60, nightMinutes: 60 }] });
const LAST_DAY = nationalFx({ employee: { joiningDate: "2026-06-30" } },
  { fixingMonth: "2026-06" });

describe("calculatePayslip", () => {
  it("pays FX in full", () => {
    const s = run(fx()).value;
    expect([s.gross, s.totalDeductions, s.net, s.employerCost])
      .toEqual([1500000n, 0n, 1500000n, 0n]);
    expect(s.earnings.map((e) => e.kind)).toEqual(["basic", "housing",
      "conveyance"]);
    expect(s.notComputed).toEqual(NOT_COMPUTED);
    expect(NOT_COMPUTED).toHaveLength(17);
    for (const words of ["private sector", "mid-month salary change",
      "Art 30(2)", "Art 19(5)", "Cabinet"]) {
      expect(NOT_COMPUTED.some((t) => t.includes(words)), words).toBe(true);
    }
    expect(s.notApplicable).toEqual(notApplicableFor("expat-full-time"));
    expect(s.notApplicable[0]).toContain("GPSSA");
    expect(s.daysInPeriod).toBe(30);
    expect(s.flags).toEqual([]);
  });
  it("pays a national under DL57", () => {
    const s = run(nationalFx(), WAGE).value;
    expect([s.gross, s.totalDeductions, s.net, s.employerCost])
      .toEqual([1500000n, 165000n, 1335000n, 187500n]);
    expect(s.notApplicable).toEqual([]);
    const used = s.flags.find((f) => f.code === "OVERRIDE_USED");
    expect(used?.detail.keys).toBe("gpssaContributionSalaryBase");
  });
  it("refuses a national without a salary base", () => {
    expect(codeOf(() => run(nationalFx()))).toBe("UNSOURCED_PARAM");
  });
  it("refuses a GCC national", () => {
    const gcc = fx({ employee: { workerClass: "gcc-national" } });
    expect(codeOf(() => run(gcc))).toBe("UNSOURCED_PARAM");
    expect(codeOf(() => run(gcc, { gpssaGccNationalContribution: "x" })))
      .toBe("UNSUPPORTED_WORKER_CLASS");
  });
  it("has no pack before March 2022", () => {
    expect(codeOf(() => run(fx({ year: 2022, month: 1 }))))
      .toBe("NO_PACK_FOR_DATE");
    expect(codeOf(() => run(nationalFx({ year: 2023, month: 10 },
      { fixingMonth: "2023-01" }), WAGE))).toBe("NO_PACK_FOR_DATE");
    expect(run(fx({ year: 2022, month: 3 })).value.net).toBe(1500000n);
  });
  it("refuses month 13 as a period, not a date", () => {
    expect(codeOf(() => run(fx({ month: 13 })))).toBe("INVALID_PERIOD");
  });
  it("adds overtime to gross", () => {
    expect(run(OT).value.gross).toBe(1516667n);
  });
  it("keeps net at zero or more for a last-day joiner", () => {
    const s = run(LAST_DAY, WAGE).value;
    expect([s.gross, s.totalDeductions, s.net, s.employerCost])
      .toEqual([49999n, 24999n, 25000n, 187500n]);
    expect(s.deferred).toEqual([{ ref: "gpssa", requested: 165000n,
      taken: 24999n, deferred: 140001n, reason: "overall-cap",
      kind: "gpssa" }]);
  });
  it("traces every line once", () => {
    for (const [i, ov] of [[OT, undefined], [LAST_DAY, WAGE]] as const) {
      const r = run(i, ov);
      expectTraced(r.value, r.trace);
    }
  });
  it("recovers GPSSA arrears", () => {
    const s = run(nationalFx({}, { arrears: fils(140001n) }), WAGE).value;
    expect(s.totalDeductions).toBe(305001n);
    expect(s.net).toBe(1194999n);
    expect(s.deferred).toEqual([]);
  });
  it("gives the same payslip twice", () => {
    expect(run(LAST_DAY, WAGE)).toEqual(run(LAST_DAY, WAGE));
  });
});
