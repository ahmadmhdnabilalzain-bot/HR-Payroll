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
  payslipWithoutPension,
  PENSION_NOT_COMPUTED,
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
    }
  }));

  it("the sum of nets equals the run total", () => each((c) => {
    const t = c.payRun.totals;
    const slips = c.payRun.payslips.map((s) => s.payslip);
    expect(slips.reduce((n, p) => n + p.net, 0n)).toBe(t.net);
    expect(slips.reduce((n, p) => n + p.gross, 0n)).toBe(t.gross);
    expect(t.gross - t.deductions).toBe(t.net);
  }));

  it("the SIF records sum to the run total less held pay", () => each(
    (c) => {
      const records = parseSif(c.sif.text).records;
      const edrs = records.filter((r) => r.type === "EDR");
      const total = edrs.reduce((n, r) => n + parseAed(fieldAt(r, 8)) +
        parseAed(fieldAt(r, 9)), 0n);
      const t = c.payRun.totals;
      expect(t.heldNet > 0n).toBe(true);
      expect(edrs).toHaveLength(c.sif.employees);
      expect(total).toBe(t.net - t.heldNet);
      expect(c.sif.total).toBe(total);
      expect(parseAed(fieldAt(records.at(-1)!, 8))).toBe(total);
    }));

  it("every payslip is the engine's output for its input", () => each(
    (c) => {
      for (const s of c.payRun.payslips) {
        const r = s.basis === "calculatePayslip"
          ? calculatePayslip(s.input, DEFAULT_PAYROLL_PACKS)
          : payslipWithoutPension(s.input);
        expect(serializeDemo(r)).toBe(serializeDemo({ value: s.payslip,
          trace: s.trace }));
      }
    }));

  it("nationals: the same engine steps as calculatePayslip", () => each(
    (c) => {
      // Pension is the only difference: compare everything else with
      // calculatePayslip on the same input as a non-national.
      for (const s of c.payRun.payslips.filter((x) =>
        x.basis === "engine-steps-without-pension")) {
        const r = calculatePayslip({ ...s.input, employee: {
          ...s.input.employee, workerClass: "expat-full-time" } },
        DEFAULT_PAYROLL_PACKS).value;
        const pick = (p: typeof r) => serializeDemo([p.earnings,
          p.deductions, p.gross, p.totalDeductions, p.net, p.caps,
          p.deferred, p.loanBalances, p.flags, p.unpaidDays,
          p.daysInPeriod, p.payStart, p.payEnd]);
        expect(pick(s.payslip)).toBe(pick(r));
      }
    }));

  it("nationals' pension is a visible 'not computed' line", () => each(
    (c) => {
      for (const s of c.payRun.payslips) {
        const national = s.payslip.workerClass === "uae-national";
        expect(s.basis === "engine-steps-without-pension").toBe(national);
        expect(s.payslip.deductions.some((d) => d.kind === "gpssa"))
          .toBe(false);
        expect(s.trace.some((l) => l.id === "pension.not-computed"))
          .toBe(national);
        expect(s.payslip.notComputed.includes(PENSION_NOT_COMPUTED.en))
          .toBe(national);
        expect(s.pension?.status ?? null)
          .toBe(national ? "not-computed" : null);
      }
    }));

  it("every payslip line has its trace line", () => each((c) => {
    for (const s of c.payRun.payslips) {
      const ids = new Set(s.trace.map((l) => l.id));
      for (const l of [...s.payslip.earnings, ...s.payslip.deductions]) {
        expect(ids.has(l.traceId)).toBe(true);
      }
    }
  }));

  it("department costs add up to the headline totals", () => each((c) => {
    const h = headlineTotals(c);
    const d = costByDepartment(c);
    expect(d.reduce((n, x) => n + x.gross, 0n)).toBe(h.gross);
    expect(d.reduce((n, x) => n + x.net, 0n)).toBe(h.net);
    expect(h.sifTotal + h.heldNet).toBe(h.net);
  }));

  it("the settlement stays outside the run and the SIF", () => each((c) => {
    const [s] = c.payRun.settlements;
    expect(c.payRun.settlements).toHaveLength(1);
    expect(s!.result.outcome).toBe("paid");
    expect(s!.result.total).toBe(s!.result.gratuity + s!.result.leavePay);
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

  it("different seeds give different pay; the default seed is 2026", () => {
    expect(serializeDemo(built.get(1)!.employees))
      .not.toBe(serializeDemo(built.get(2026)!.employees));
    expect(serializeDemo(buildDemoCompany()))
      .toBe(serializeDemo(built.get(2026)!));
  });
});
