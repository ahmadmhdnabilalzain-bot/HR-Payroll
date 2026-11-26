import { describe, expect, it } from "vitest";
import { calculatePayslip, DEFAULT_PAYROLL_PACKS } from "@payroll/engine";
import {
  buildDemoCompany,
  ruleChange,
  ruleChangePreview,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE rule-change preview (S09)", () => {
  it("is labelled hypothetical and never claims the law", () => {
    const ch = ruleChange();
    expect(ch.hypothetical).toBe(true);
    expect(ch.label).toMatch(/Hypothetical, for demonstration/);
    expect(ch.label).toMatch(/Not a change in the law/);
    expect(ch.sourceText).toMatch(/^No source/);
    expect(ch.values.map((v) => [v.from, v.to]))
      .toEqual([[2500, 3000], [5000, 6000]]);
  });

  it("the old values are the pack in force", () => {
    const pack = DEFAULT_PAYROLL_PACKS.payroll[0]!;
    for (const v of ruleChange().values) {
      expect(pack.params[v.key]?.value).toBe(v.from);
    }
  });

  it("re-runs every October payslip; only overtime people move", () =>
    each((c) => {
      const r = ruleChangePreview(c);
      expect(r.checked).toBe(c.payRun.payslips.length);
      expect(r.unchanged + r.rows.length).toBe(r.checked);
      const withOt = c.payRun.payslips.filter((s) =>
        s.input.overtime.some((o) => o.minutes > 0)).map((s) =>
        s.employeeId).sort();
      expect(r.rows.map((x) => x.employeeId).sort()).toEqual(withOt);
      expect(r.rows.length).toBeGreaterThan(0);
      for (const x of r.rows) expect(x.difference > 0n).toBe(true);
    }));

  it("before is the stored payslip; after is the engine with overrides",
    () => each((c) => {
      const r = ruleChangePreview(c);
      for (const x of r.rows) {
        const s = c.payRun.payslips.find((p) => p.employeeId ===
          x.employeeId)!;
        expect(x.beforeNet).toBe(s.payslip.net);
        const after = calculatePayslip(s.input, DEFAULT_PAYROLL_PACKS,
          { overtimeUpliftBps: 3000, nightOvertimeUpliftBps: 6000 }).value;
        expect(x.afterNet).toBe(after.net);
        expect(x.difference).toBe(x.afterNet - x.beforeNet);
        expect(x.lines.reduce((n, l) => n + l.after - l.before, 0n))
          .toBe(x.grossDifference);
      }
    }));

  it("the differences add up to the run's change", () => each((c) => {
    const r = ruleChangePreview(c);
    const d = r.rows.reduce((n, x) => n + x.difference, 0n);
    expect(r.totals.difference).toBe(d);
    expect(r.totals.beforeNet).toBe(c.payRun.totals.net);
    expect(r.totals.afterNet).toBe(c.payRun.totals.net + d);
  }));

  it("does not change the October run", () => {
    const c = buildDemoCompany();
    const before = asText(c.payRun.totals);
    ruleChangePreview(c);
    expect(asText(c.payRun.totals)).toBe(before);
  });

  it("the seed-2026 figures (two people)", () => {
    const r = ruleChangePreview(buildDemoCompany());
    expect(r.rows.map((x) => [x.name, x.display.difference])).toEqual([
      ["Vikram Rao", "+AED 37.76"], ["Jose Reyes", "+AED 10.00"]]);
    expect(r.summaryText).toMatch(/31 payslips re-run; 2 people change/);
  });

  it("each notice names the person, the change and the figures", () =>
    each((c) => {
      const r = ruleChangePreview(c);
      for (const x of r.rows) {
        expect(x.notice).toMatch(/Hypothetical, for demonstration/);
        expect(x.notice).toContain(x.display.after);
        expect(x.notice).toContain(x.display.difference);
        expect(x.notice).toContain(r.noticeFrom.name);
      }
      expect(r.deciders.hr.employeeId).not.toBe(r.deciders.gm.employeeId);
    }));

  it("no authority wording, no raw ISO dates in display strings", () =>
    each((c) => {
      const r = ruleChangePreview(c);
      const text = asText({ ...r, change: { ...r.change,
        proposedOn: r.change.proposedOn.display,
        effectiveFrom: r.change.effectiveFrom.display } });
      expect(text).not.toMatch(BANNED_WORDS);
      expect(text).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
      expect(text).not.toMatch(/\bcompliant\b/i);
    }));
});
