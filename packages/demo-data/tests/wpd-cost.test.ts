import {
  GRATUITY_PACKS,
  calculateSettlement,
  formatAed,
} from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  AS_OF,
  EMPLOYER_PENSION_NOT_COMPUTED,
  buildDemoCompany,
  costByDepartment,
  employerCostView,
  gratuityProvision,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPD gratuity provision", () => {
  it("each row is calculateSettlement's own answer", () => each((c) => {
    const p = gratuityProvision(c);
    expect(p.asOf).toBe(AS_OF);
    for (const r of p.rows) {
      const e = c.employees.find((x) => x.id === r.employeeId)!;
      const g = calculateSettlement({ gratuity: { joiningDate:
        e.joiningDate, lastWorkingDate: AS_OF, unpaidLeaveDays: 0,
      lastBasicMonthly: e.basicMonthly, workerClass: e.workerClass },
      unusedLeaveDays: 0 }, GRATUITY_PACKS).value;
      expect(r.outcome).toBe(g.outcome);
      expect(r.amount).toBe(g.outcome === "paid" ? g.gratuity : null);
    }
  }));

  it("nationals are not applicable in words, never AED 0.00", () => each(
    (c) => {
      const p = gratuityProvision(c);
      const nat = c.employees.filter((e) => e.workerClass ===
        "uae-national");
      const rows = p.rows.filter((r) => r.outcome === "not-applicable");
      expect(rows.map((r) => r.employeeId).sort())
        .toEqual(nat.map((e) => e.id).sort());
      for (const r of rows) {
        expect(r.amount).toBeNull();
        expect(r.display.amount).toMatch(/Not applicable/);
      }
      expect(asText(p)).not.toContain("AED 0.00");
    }));

  it("total, departments and counts add up; the leaver is apart", () =>
    each((c) => {
      const p = gratuityProvision(c);
      const sum = p.rows.reduce((n, r) => n + (r.amount ?? 0n), 0n);
      expect(p.total).toBe(sum);
      expect(p.byDepartment.reduce((n, d) => n + d.amount, 0n))
        .toBe(p.total);
      expect(p.counts.paid + p.counts["not-eligible"] +
        p.counts["not-applicable"]).toBe(p.rows.length);
      expect(p.rows.length).toBe(c.employees.length - 1);
      expect(p.settlement).toHaveLength(1);
      expect(p.settlement[0]!.amount).toBe(c.payRun.settlements[0]!
        .result.gratuity);
      expect(p.rows.some((r) => r.employeeId ===
        p.settlement[0]!.employeeId)).toBe(false);
      expect(p.display.total).toBe(formatAed(p.total));
      expect(p.basis).toMatch(/Unpaid leave is counted as 0 days/);
    }));

  it("the new hire is not yet eligible", () => each((c) => {
    const hire = c.employees.find((e) => e.cases.includes("probation"))!;
    const r = gratuityProvision(c).rows.find((x) => x.employeeId ===
      hire.id)!;
    expect(r.outcome).toBe("not-eligible");
    expect(r.amount).toBeNull();
  }));
});

describe("WPD employer cost", () => {
  it("gross and the computed employer amount equal the run's totals",
    () => each((c) => {
      const v = employerCostView(c);
      expect(v.gross).toBe(c.payRun.totals.gross);
      expect(v.employerComputed).toBe(c.payRun.totals.employerCost);
      expect(v.partialTotal).toBe(c.payRun.totals.gross +
        c.payRun.totals.employerCost);
      expect(v.rows).toHaveLength(c.payRun.payslips.length);
    }));

  it("departments agree with costByDepartment", () => each((c) => {
    const v = employerCostView(c);
    for (const d of costByDepartment(c)) {
      const mine = v.byDepartment.find((x) => x.departmentId ===
        d.departmentId)!;
      expect(mine.gross).toBe(d.gross);
      expect(mine.headcount).toBe(d.headcount);
    }
  }));

  it("every UAE national is not computed, said in words, total partial",
    () => each((c) => {
      const v = employerCostView(c);
      const nat = c.employees.filter((e) => e.workerClass ===
        "uae-national");
      expect(v.notComputedCount).toBe(nat.length);
      for (const r of v.rows) {
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        expect(r.employer.status).toBe(e.workerClass === "uae-national"
          ? "not-computed" : "computed");
        if (r.employer.status === "not-computed") {
          expect(r.employer.note).toBe(EMPLOYER_PENSION_NOT_COMPUTED);
          expect(r.display.employer).toMatch(/Not computed/);
        }
      }
      expect(v.display.headline).toMatch(/partial/);
      expect(v.caveat).toMatch(/partial/);
    }));
});

describe("WPD cost wording", () => {
  it("names no authority decision as approved or certified", () => each(
    (c) => {
      expect(asText([gratuityProvision(c), employerCostView(c)]))
        .not.toMatch(BANNED_WORDS);
    }));
});
