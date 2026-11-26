import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import {
  buildDemoCompany,
  draftProblem,
  draftTitle,
  newDraft,
  sandboxOptions,
  sandboxPayslip,
  sandboxRun,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

const DRAFTS = (c: DemoCompany) => sandboxOptions(c).presets
  .map((p) => p.draft);

const RAW_ISO = /\b\d{4}-\d{2}-\d{2}\b/;

describe("WPE pay-structure sandbox (R41)", () => {
  it("an empty draft reproduces every stored payslip exactly", () =>
    each((c) => {
      const none = newDraft("housing-raise");
      for (const s of c.payRun.payslips) {
        expect(sandboxPayslip(s, s.input).net).toBe(s.payslip.net);
      }
      expect(sandboxRun(c, none).rows).toEqual([]);
      const ot = sandboxRun(c, newDraft("overtime-rates"));
      expect(ot.rows).toEqual([]);
    }));

  it("every preset moves at least one person, on every seed", () =>
    each((c) => {
      for (const d of DRAFTS(c)) {
        const r = sandboxRun(c, d);
        expect([d.kind, r.rows.length > 0]).toEqual([d.kind, true]);
        expect(r.unchanged + r.rows.length).toBe(c.payRun.payslips.length);
      }
    }));

  it("never touches the October run or the stored payslips", () =>
    each((c) => {
      const before = asText({ t: c.payRun.totals,
        p: c.payRun.payslips.map((s) => [s.input, s.payslip]) });
      for (const d of DRAFTS(c)) sandboxRun(c, d);
      expect(asText({ t: c.payRun.totals,
        p: c.payRun.payslips.map((s) => [s.input, s.payslip]) }))
        .toBe(before);
    }));

  it("the default October net stays 933,730.94", () => {
    const c = buildDemoCompany();
    sandboxRun(c, DRAFTS(c)[0]!);
    expect(c.payRun.totals.net).toBe(fils(93373094n));
  });

  it("housing raise: only the chosen grade moves, by the engine", () =>
    each((c) => {
      const d = DRAFTS(c)[0]!;
      const r = sandboxRun(c, d);
      for (const x of r.rows) {
        const e = c.employees.find((y) => y.id === x.employeeId)!;
        expect(e.grade).toBe(d.grade);
        const s = c.payRun.payslips.find((y) => y.employeeId === e.id)!;
        const h = s.input.employee.allowances.find((a) =>
          a.kind === "housing")!.monthly;
        expect(x.difference.gross).toBe(fils((h * 500n + 5000n) / 10000n));
        expect(x.before.net).toBe(s.payslip.net);
        expect(x.after.net - x.before.net).toBe(x.difference.net);
        expect(x.lines.map((l) => l.after - l.before)
          .reduce((n, v) => n + v, 0n)).toBe(x.difference.gross);
      }
    }));

  it("the new allowance reaches everyone and is one new line", () =>
    each((c) => {
      const r = sandboxRun(c, DRAFTS(c)[1]!);
      expect(r.rows.length).toBe(r.inScope);
      for (const x of r.rows) {
        expect(x.lines.some((l) => l.before === 0n &&
          l.label.length > 0)).toBe(true);
      }
    }));

  it("totals are the sum of the rows; employer cost is gross plus " +
    "employer amounts", () => each((c) => {
    for (const d of DRAFTS(c)) {
      const r = sandboxRun(c, d);
      const sum = (f: (x: typeof r.rows[number]) => bigint) =>
        r.rows.reduce((n, x) => n + f(x), 0n);
      expect(r.totals.net).toBe(sum((x) => x.difference.net));
      expect(r.totals.gross).toBe(sum((x) => x.difference.gross));
      expect(r.totals.afterNet).toBe(r.totals.beforeNet + r.totals.net);
      for (const x of r.rows) {
        expect(x.difference.employerCost).toBe(
          x.difference.gross + x.difference.employer);
      }
    }
  }));

  it("nationals keep pension and employer pension Not computed", () =>
    each((c) => {
      const r = sandboxRun(c, newDraft("new-allowance",
        { monthly: fils(30000n) }));
      const nationals = r.rows.filter((x) => x.pensionNotComputed);
      expect(nationals.length).toBeGreaterThan(0);
      for (const x of nationals) expect(x.difference.employer).toBe(0n);
      expect(r.pensionNotComputed).toBe(nationals.length);
    }));

  it("the overtime draft moves only people with overtime, upward", () =>
    each((c) => {
      const r = sandboxRun(c, newDraft("overtime-rates",
        { dayBps: 3000, nightBps: 6000 }));
      const withOt = c.payRun.payslips.filter((s) =>
        s.input.overtime.some((o) => o.minutes > 0))
        .map((s) => s.employeeId).sort();
      expect(r.rows.map((x) => x.employeeId).sort()).toEqual(withOt);
      for (const x of r.rows) expect(x.difference.net > 0n).toBe(true);
    }));

  it("checks a draft before running it", () => {
    expect(draftProblem(newDraft("housing-raise"))).not.toBeNull();
    expect(draftProblem(newDraft("housing-raise",
      { percentBps: 500 }))).toBeNull();
    expect(draftProblem(newDraft("new-allowance"))).not.toBeNull();
    expect(draftProblem(newDraft("overtime-rates",
      { dayBps: 4000, nightBps: 3000 }))).not.toBeNull();
  });

  it("is deterministic and uses no banned or raw-date wording", () =>
    each((c) => {
      for (const d of DRAFTS(c)) {
        const a = asText(sandboxRun(c, d));
        expect(asText(sandboxRun(c, d))).toBe(a);
        const words = asText([draftTitle(d), sandboxRun(c, d).title,
          sandboxRun(c, d).summaryText, sandboxRun(c, d).scopeText]);
        expect(words).not.toMatch(BANNED_WORDS);
        expect(words).not.toMatch(RAW_ISO);
      }
      expect(asText(sandboxOptions(c))).not.toMatch(BANNED_WORDS);
    }));
});
