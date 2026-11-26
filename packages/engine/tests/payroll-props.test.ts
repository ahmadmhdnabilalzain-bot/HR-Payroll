import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, daysInMonth } from "../src/dates";
import { expectedFixingMonth } from "../src/payroll/gpssa";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import type { PayslipInput } from "../src/payroll/types";
import { payslipCase, type Case } from "./payroll-arbitrary";
import { expectTraced } from "./payroll-fixture";

const RUNS = { numRuns: 200 };
const run = (c: Case) =>
  calculatePayslip(c.input, DEFAULT_PAYROLL_PACKS, c.ov);
const sum = (xs: { amount: bigint }[]) =>
  xs.reduce((s, x) => s + x.amount, 0n);
const gross = (input: PayslipInput, c: Case) =>
  run({ input, ov: c.ov }).value.gross;

/** The case without absences or variable pay, open-ended. */
function plain(c: Case): PayslipInput {
  return { ...c.input, absences: [], overtime: [], restDayWork: [],
    encashLeaveDays: 0, employee: { ...c.input.employee,
      leavingDate: null, probationEndDate: null } };
}

function withJoining(i: PayslipInput, joiningDate: string): PayslipInput {
  const g = i.employee.gpssa;
  const gpssa = g === null ? null
    : { ...g, fixingMonth: expectedFixingMonth(joiningDate, 2026) };
  return { ...i, employee: { ...i.employee, joiningDate, gpssa } };
}

describe("calculatePayslip properties", () => {
  it("net is never negative", () => {
    fc.assert(fc.property(payslipCase, (c) => {
      expect(run(c).value.net >= 0n).toBe(true);
    }), RUNS);
  });
  it("lines add up to the totals", () => {
    fc.assert(fc.property(payslipCase, (c) => {
      const s = run(c).value;
      expect(s.gross).toBe(sum(s.earnings));
      expect(s.totalDeductions).toBe(sum(s.deductions));
      expect(s.net).toBe(s.gross - s.totalDeductions);
      expect(s.employerCost).toBe(sum(s.employerCosts));
    }), RUNS);
  });
  it("every money field has a matching trace line", () => {
    fc.assert(fc.property(payslipCase, (c) => {
      const { value: s, trace } = run(c);
      expectTraced(s, trace);
      const byRef = (ref: string) => trace.find((l) =>
        l.id.startsWith("ded.") && l.inputs["ref"] === ref);
      for (const d of s.deferred) {
        expect(byRef(d.ref)?.inputs["deferred"]).toBe(String(d.deferred));
      }
      for (const b of s.loanBalances) {
        expect(byRef(b.ref)?.inputs).toMatchObject({
          balanceBefore: String(b.before), balanceAfter: String(b.after) });
      }
    }), RUNS);
  });
  it("deductions never exceed half the earned wage", () => {
    fc.assert(fc.property(payslipCase, (c) => {
      const s = run(c).value;
      expect(s.totalDeductions <= s.caps.overall).toBe(true);
      expect(s.caps.overall * 2n <= s.caps.wageBase).toBe(true);
    }), RUNS);
  });
  it("an earlier joining date never lowers gross", () => {
    fc.assert(fc.property(payslipCase, fc.integer({ min: 1, max: 30 }),
      fc.integer({ min: 1, max: 30 }), (c, a, b) => {
        const i = plain(c);
        const dim = daysInMonth(2026, i.month);
        const late = Math.min(Math.max(a, b), dim);
        const early = Math.min(a, b, late);
        const start = `2026-${String(i.month).padStart(2, "0")}-01`;
        const g1 = gross(withJoining(i, addDays(start, early - 1)), c);
        const g2 = gross(withJoining(i, addDays(start, late - 1)), c);
        expect(g1 >= g2).toBe(true);
      }), RUNS);
  });
  it("one more unpaid day never raises gross", () => {
    fc.assert(fc.property(payslipCase, (c) => {
      const s = run(c).value;
      const used = new Set([...c.input.absences, ...c.input.overtime,
        ...c.input.restDayWork].map((x) => x.date));
      let free: string | null = null;
      for (let d = s.payStart; d <= s.payEnd; d = addDays(d, 1)) {
        if (!used.has(d)) free = d;
      }
      if (free === null) return;
      const more = { ...c.input, absences: [...c.input.absences,
        { date: free, kind: "unpaid" as const }] };
      expect(gross(more, c) <= s.gross).toBe(true);
    }), RUNS);
  });
  it("the same input gives the same output", () => {
    fc.assert(fc.property(payslipCase, (c) => {
      expect(run(c)).toEqual(run(c));
    }), RUNS);
  });
});
