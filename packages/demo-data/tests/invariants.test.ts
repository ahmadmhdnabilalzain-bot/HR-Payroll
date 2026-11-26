import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  parseAed,
} from "@payroll/engine";
import { fieldAt, parseSif } from "@payroll/wps";
import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  costByDepartment,
  headlineTotals,
  overridesFor,
  serializeDemo,
  type DemoCompany,
} from "../src/index";

const SEEDS = [1, 2026, 7777];
const built = new Map<number, DemoCompany>(SEEDS.map((s) =>
  [s, buildDemoCompany(s)]));
const each = (fn: (c: DemoCompany) => void) => {
  for (const s of SEEDS) fn(built.get(s)!);
};
const sum = (xs: { amount: bigint }[]) =>
  xs.reduce((n, x) => n + x.amount, 0n);

describe("pay run invariants (seeds 1, 2026, 7777)", () => {
  it("every payslip's lines sum to its net", () => each((c) => {
    for (const s of c.payRun.payslips) {
      const p = s.payslip;
      expect(sum(p.earnings)).toBe(p.gross);
      expect(sum(p.deductions)).toBe(p.totalDeductions);
      expect(sum(p.earnings) - sum(p.deductions)).toBe(p.net);
      expect(sum(p.employerCosts)).toBe(p.employerCost);
    }
  }));

  it("the sum of nets equals the run total", () => each((c) => {
    const t = c.payRun.totals;
    const slips = c.payRun.payslips.map((s) => s.payslip);
    expect(slips.reduce((n, p) => n + p.net, 0n)).toBe(t.net);
    expect(slips.reduce((n, p) => n + p.gross, 0n)).toBe(t.gross);
    expect(t.gross - t.deductions).toBe(t.net);
    expect(t.payslips).toBe(slips.length);
  }));

  it("the SIF record sum equals the run total", () => each((c) => {
    const records = parseSif(c.sif.text).records;
    const edrs = records.filter((r) => r.type === "EDR");
    const total = edrs.reduce((n, r) => n + parseAed(fieldAt(r, 8)) +
      parseAed(fieldAt(r, 9)), 0n);
    expect(edrs).toHaveLength(c.payRun.payslips.length);
    expect(total).toBe(c.payRun.totals.net);
    expect(c.sif.total).toBe(c.payRun.totals.net);
    const scr = records.at(-1)!;
    expect(scr.type).toBe("SCR");
    expect(parseAed(fieldAt(scr, 8))).toBe(c.payRun.totals.net);
  }));

  it("every payslip is the engine's output for its input", () => each((c) => {
    const byId = new Map(c.employees.map((e) => [e.id, e]));
    for (const s of c.payRun.payslips) {
      const r = calculatePayslip(s.input, DEFAULT_PAYROLL_PACKS,
        overridesFor(byId.get(s.employeeId)!));
      expect(serializeDemo(r.value)).toBe(serializeDemo(s.payslip));
      expect(serializeDemo(r.trace)).toBe(serializeDemo(s.trace));
    }
  }));

  it("every payslip line has its trace line with rule ids", () => each(
    (c) => {
      for (const s of c.payRun.payslips) {
        const ids = new Set(s.trace.map((l) => l.id));
        const lines = [...s.payslip.earnings, ...s.payslip.deductions,
          ...s.payslip.employerCosts];
        for (const l of lines) expect(ids.has(l.traceId)).toBe(true);
        expect(s.trace.some((l) => l.rules.length > 0)).toBe(true);
      }
    }));

  it("department costs add up to the headline totals", () => each((c) => {
    const h = headlineTotals(c);
    const d = costByDepartment(c);
    expect(d.reduce((n, x) => n + x.gross, 0n)).toBe(h.gross);
    expect(d.reduce((n, x) => n + x.totalCost, 0n)).toBe(h.totalCost);
    expect(d.reduce((n, x) => n + x.headcount, 0)).toBe(h.payslips);
    expect(h.sifTotal).toBe(h.net);
  }));

  it("settlements stay outside the run total and the SIF", () => each(
    (c) => {
      const [s] = c.payRun.settlements;
      expect(c.payRun.settlements).toHaveLength(1);
      expect(s!.result.outcome).toBe("paid");
      expect(s!.result.total).toBe(s!.result.gratuity +
        s!.result.leavePay);
      expect(headlineTotals(c).settlements).toBe(s!.result.total);
    }));
});

describe("determinism", () => {
  it("reruns with the same seed are byte-identical", () => {
    for (const s of SEEDS) {
      expect(serializeDemo(buildDemoCompany(s)))
        .toBe(serializeDemo(built.get(s)!));
    }
  });

  it("different seeds give different companies", () => {
    const a = serializeDemo(built.get(1)!.employees);
    expect(a).not.toBe(serializeDemo(built.get(2026)!.employees));
  });

  it("the default seed is 2026", () => {
    expect(serializeDemo(buildDemoCompany()))
      .toBe(serializeDemo(built.get(2026)!));
  });
});
