import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  formatAed,
} from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  employeesWithCase,
  finalSettlements,
  loans,
  payCorrections,
  payElements,
  payGroups,
  pastRuns,
  payslipWithoutPension,
  payTrend,
  runChanges,
  salaryRevisions,
  serializeDemo,
  trafficFines,
} from "../src/index";

const c = buildDemoCompany();
const ISO = /\d{4}-\d{2}-\d{2}/;
const sum = (xs: { amount: bigint }[]) =>
  xs.reduce((n, x) => n + x.amount, 0n);

describe("WP6 past pay runs", () => {
  const runs = pastRuns(c);

  it("June to September, every payslip from the engine", () => {
    expect(runs.map((r) => r.month)).toEqual([6, 7, 8, 9]);
    for (const r of runs) {
      for (const s of r.payslips) {
        const again = s.basis === "calculatePayslip"
          ? calculatePayslip(s.input, DEFAULT_PAYROLL_PACKS)
          : payslipWithoutPension(s.input);
        expect(serializeDemo(again.value)).toBe(serializeDemo(s.payslip));
        expect(sum(s.payslip.earnings) - sum(s.payslip.deductions))
          .toBe(s.payslip.net);
      }
      expect(r.totals.net).toBe(r.payslips.reduce((n, s) =>
        n + s.payslip.net, 0n));
      expect(r.status).toBe("paid");
      expect(r.display.net).toBe(formatAed(r.totals.net));
    }
  });

  it("September paid the back-pay case on the old basic", () => {
    const e = employeesWithCase(c, "back-pay")[0]!;
    const sep = runs.find((r) => r.month === 9)!;
    const s = sep.payslips.find((x) => x.employeeId === e.id)!;
    expect(s.payslip.gross).toBe(c.payRun.backPay[0]!.paidGross);
  });

  it("the trend ends with October and the changes explain it", () => {
    const t = payTrend(c);
    expect(t.map((x) => x.month)).toEqual([6, 7, 8, 9, 10]);
    expect(t.at(-1)!.net).toBe(c.payRun.totals.net);
    expect(t[0]!.changeDisplay).toBe("");
    for (const x of t.slice(1)) expect(x.changeDisplay).toMatch(/^[+-]/);
    const oct = runChanges(c, 10);
    const reasons = oct.flatMap((x) => x.reasons);
    for (const r of ["joined", "left", "basic revised", "back pay",
      "overtime", "unpaid leave", "sick day unpaid", "loan deduction"]) {
      expect(reasons).toContain(r);
    }
    const july = runChanges(c, 7).flatMap((x) => x.reasons);
    expect(july).toContain("basic revised");
    for (const x of oct) expect(x.display.change).not.toMatch(ISO);
  });
});

describe("WP6 changes and owed", () => {
  it("salary revisions: arrears from the engine", () => {
    const r = salaryRevisions(c);
    const late = r.find((x) => x.arrears > 0n)!;
    expect(late.arrears).toBe(c.payRun.backPay[0]!.amount);
    expect(late.display.effective).toBe("1 September");
    const onTime = r.find((x) => x.arrears === 0n)!;
    const june = pastRuns(c)[0]!.payslips.find((s) =>
      s.employeeId === onTime.employeeId)!;
    expect(june.input.employee.basicMonthly).toBe(onTime.fromBasic);
  });

  it("loans: balances from the engine, a closed and a new one", () => {
    const l = loans(c);
    const active = l.find((x) => x.ref === "LN-2041")!;
    const oct = c.payRun.payslips.find((s) =>
      s.employeeId === active.employeeId)!;
    expect(active.balance).toBe(oct.payslip.loanBalances[0]!.after);
    expect(active.status).toBe("active");
    const closed = l.find((x) => x.status === "closed")!;
    expect(closed.balance).toBe(0n);
    expect(closed.ledger.map((x) => x.month)).toEqual([6, 7, 8]);
    const advance = l.find((x) => x.kind === "advance")!;
    expect(advance.status).toBe("approved");
    expect(advance.display.firstDeduction).toBe("November");
  });

  it("pay corrections: the engine's difference, pending", () => {
    for (const x of payCorrections(c)) {
      expect(x.amount).toBe(x.correctNet - x.paidNet);
      expect(x.amount > 0n).toBe(true);
      expect(x.status).toBe("pending");
      expect(x.display.amount).toBe(formatAed(x.amount));
      expect(x.reason).not.toMatch(ISO);
    }
    expect(payCorrections(c)).toHaveLength(2);
  });

  it("traffic fines wait for a decision; recovery is not computed", () => {
    const f = trafficFines(c);
    expect(f.length).toBeGreaterThanOrEqual(2);
    for (const x of f) {
      expect(x.status).toBe("to-decide");
      expect(x.number.fake).toBe(true);
      expect(x.recoveryNote).toMatch(/not computed/);
      expect(x.display.date).not.toMatch(ISO);
    }
  });

  it("final settlements list the engine's settlement", () => {
    const f = finalSettlements(c);
    const s = c.payRun.settlements[0]!;
    expect(f).toHaveLength(1);
    expect(f[0]!.total).toBe(s.result.total);
    expect(f[0]!.display.total).toBe(formatAed(s.result.total));
    expect(f[0]!.display.lastDay).toBe("15 October");
    expect(f[0]!.display.due).toBe("29 October");
    expect(f[0]!.notComputed).toEqual(s.result.notComputed);
  });
});

describe("WP6 reference data", () => {
  it("every payslip is in exactly one pay group", () => {
    const g = payGroups(c);
    for (const s of c.payRun.payslips) {
      expect(g.filter((x) => x.employeeIds.includes(s.employeeId)))
        .toHaveLength(1);
    }
  });

  it("pay elements cover every October earning and deduction", () => {
    const codes = new Set(payElements().map((x) => x.code));
    for (const s of c.payRun.payslips) {
      for (const l of [...s.payslip.earnings, ...s.payslip.deductions]) {
        const code = l.traceId.startsWith("earn.allowance#")
          ? l.traceId.slice(15) : l.kind;
        expect(codes.has(code), code).toBe(true);
      }
    }
  });

  it("is deterministic", () => {
    const d = buildDemoCompany();
    expect(serializeDemo([pastRuns(d), loans(d), payCorrections(d)]))
      .toBe(serializeDemo([pastRuns(c), loans(c), payCorrections(c)]));
  });
});
