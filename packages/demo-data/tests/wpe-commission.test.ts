import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import {
  buildDemoCompany,
  COMMISSION_JOBS,
  commissionBands,
  commissionPlan,
  commissionTotals,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE commission: statements", () => {
  it("one per salesperson who is still here", () => each((c) => {
    const p = commissionPlan(c);
    const ids = c.employees.filter((e) => e.leavingDate === null &&
      COMMISSION_JOBS.includes(e.jobKey)).map((e) => e.id);
    expect(p.statements.map((s) => s.employeeId).sort())
      .toEqual(ids.sort());
    expect(p.statements.length).toBeGreaterThanOrEqual(5);
  }));

  it("the bands add up to the sales booked", () => each((c) => {
    for (const s of commissionPlan(c).statements) {
      const n = s.bands.reduce((a, b) => a + b.sales, 0n);
      expect(n).toBe(s.booked);
    }
  }));

  it("commission is the sum of the bands; payable is less the clawback",
    () => each((c) => {
      for (const s of commissionPlan(c).statements) {
        expect(s.commission).toBe(fils(s.bands.reduce((a, b) =>
          a + b.commission, 0n)));
        const left = s.commission - s.clawback;
        expect(s.payable).toBe(left > 0n ? left : 0n);
        expect(s.carried).toBe(left < 0n ? -left : 0n);
      }
    }));

  it("below 80 percent pays nothing; above 120 pays the top rate", () => {
    const target = fils(60000000n);
    expect(commissionBands(target, fils(44400000n))
      .every((b) => b.commission === 0n)).toBe(true);
    const hi = commissionBands(target, fils(78600000n));
    expect(hi[3]!.sales).toBe(fils(78600000n - 72000000n));
    expect(hi[3]!.commission).toBe(fils(6600000n * 450n / 10000n));
  });

  it("the sample has a clawback, a nil month and a top tier", () =>
    each((c) => {
      const s = commissionPlan(c).statements;
      expect(s.some((x) => x.clawback > 0n)).toBe(true);
      expect(s.some((x) => x.commission === 0n)).toBe(true);
      expect(s.some((x) => x.bands[3]!.sales > 0n)).toBe(true);
    }));

  it("the engine decides the deductions: none requested, net is payable",
    () => each((c) => {
      for (const s of commissionPlan(c).statements) {
        expect(s.deductions).toBe(0n);
        expect(s.net).toBe(s.payable);
      }
    }));

  it("totals add up", () => each((c) => {
    const p = commissionPlan(c);
    const t = commissionTotals(p);
    expect(t.count).toBe(p.statements.length);
    expect(t.commission).toBe(fils(p.statements.reduce((n, s) =>
      n + s.commission, 0n)));
    expect(t.net).toBeLessThanOrEqual(t.commission);
  }));
});

describe("WPE commission: words", () => {
  it("no authority wording, no raw dates", () => each((c) => {
    const text = asText(commissionPlan(c));
    expect(text).not.toMatch(BANNED_WORDS);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  }));
});
