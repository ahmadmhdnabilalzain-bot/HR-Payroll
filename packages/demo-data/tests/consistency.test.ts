import { formatAed, type Fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  pastRuns,
  payrollHistory,
  payTrend,
  trendRows,
  varianceBetween,
} from "../src/index";

const c = buildDemoCompany();

interface Figures { gross: Fils; deductions: Fils; net: Fils }

/** The engine's payslips decide: pastRuns (June to Sep), the run (Oct). */
function truth(month: number): Figures {
  if (month === 10) {
    const t = c.payRun.totals;
    return { gross: t.gross, deductions: t.deductions, net: t.net };
  }
  const r = pastRuns(c).find((x) => x.month === month)!;
  return { gross: r.totals.gross, deductions: r.totals.deductions,
    net: r.totals.net };
}

const key = (m: number) => `2026-${String(m).padStart(2, "0")}`;

describe("every month agrees across the selectors", () => {
  for (const m of [6, 7, 8, 9, 10]) {
    it(`${key(m)}: gross, deductions and net`, () => {
      const want = truth(m);
      const t = payTrend(c).find((x) => x.month === m)!;
      const h = payrollHistory(c).find((x) => x.month === key(m))!;
      const row = trendRows(c).find((x) => x.month === key(m))!;
      for (const got of [t, h]) {
        expect(got.gross).toBe(want.gross);
        expect(got.deductions).toBe(want.deductions);
        expect(got.net).toBe(want.net);
      }
      expect(row.grossText).toBe(formatAed(want.gross));
      expect(row.netText).toBe(formatAed(want.net));
      expect(h.headcount).toBe(t.payslips);
    });
  }

  it("each month's lines are the pastRuns payslips", () => {
    for (const r of pastRuns(c)) {
      const h = payrollHistory(c).find((x) => x.month === key(r.month))!;
      for (const s of r.payslips) {
        const l = h.lines.find((x) => x.employeeId === s.employeeId)!;
        expect(l.gross).toBe(s.payslip.gross);
        expect(l.net).toBe(s.payslip.net);
      }
    }
  });

  it("month-on-month changes agree (variance, trend, run detail)", () => {
    for (const m of [7, 8, 9, 10]) {
      const v = varianceBetween(c, key(m), key(m - 1));
      const now = truth(m);
      const before = truth(m - 1);
      expect(v.grossChange).toBe(now.gross - before.gross);
      expect(v.netChange).toBe(now.net - before.net);
      expect(v.drivers.reduce((n, d) => n + d.amount, 0n))
        .toBe(v.grossChange);
      const t = payTrend(c).find((x) => x.month === m)!;
      const sign = now.net - before.net >= 0n ? "+" : "";
      expect(t.changeDisplay).toBe(sign + formatAed((now.net -
        before.net) as Fils));
    }
  });
});
