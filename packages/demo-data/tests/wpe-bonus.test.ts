import { describe, expect, it } from "vitest";
import { fils, mulDiv } from "@payroll/engine";
import {
  AS_OF,
  BONUS_BASIS,
  BONUS_PAY_DATE,
  bonusPlan,
  bonusScopeIds,
  bonusSlip,
  bonusTotals,
  buildDemoCompany,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE bonus: the plan", () => {
  it("a sample of people, rated 4 or 5, in the plan's order", () =>
    each((c) => {
      const p = bonusPlan(c);
      expect(p.rows.length).toBeGreaterThanOrEqual(3);
      expect(p.rows.length).toBeLessThan(c.employees.length);
      for (const r of p.rows) expect([4, 5]).toContain(r.rating);
      const ratings = p.rows.map((r) => r.rating);
      expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    }));

  it("each bonus is its rate on basic, rounded once on whole fils", () =>
    each((c) => {
      for (const r of bonusPlan(c).rows) {
        expect(r.bonus).toBe(mulDiv(r.basic, r.bps, 10000n, "HALF_UP"));
        expect(r.bonus).toBeGreaterThan(0n);
      }
    }));

  it("leavers, probation and late joiners are left out", () => each((c) => {
    const p = bonusPlan(c);
    const out = new Set(c.employees.filter((e) => e.leavingDate !== null ||
      e.cases.includes("probation")).map((e) => e.id));
    expect(p.rows.some((r) => out.has(r.employeeId))).toBe(false);
    expect(p.leftOut.map((x) => x.reason)).toContain("Has left");
    const n = p.leftOut.reduce((a, x) => a + x.count, 0);
    expect(n + p.rows.length).toBe(c.employees.length);
  }));

  it("the engine decides the deductions: none requested, none taken",
    () => each((c) => {
      for (const r of bonusPlan(c).rows) {
        expect(r.deductions).toBe(0n);
        expect(r.net).toBe(r.bonus);
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        const s = bonusSlip(e, r.bonus);
        expect(s.net).toBe(fils(s.gross - s.deductions));
        expect(s.overallCap).toBe(mulDiv(r.bonus, 5000n, 10000n, "HALF_UP"));
      }
    }));
});

describe("WPE bonus: totals and scopes", () => {
  it("the run's totals add up from its people", () => each((c) => {
    const p = bonusPlan(c);
    const all = bonusTotals(p, bonusScopeIds(p, "all"));
    expect(all.count).toBe(p.rows.length);
    expect(all.gross).toBe(fils(p.rows.reduce((n, r) => n + r.bonus, 0n)));
    expect(all.net).toBe(all.gross);
    const top = bonusTotals(p, bonusScopeIds(p, "top"));
    expect(top.count).toBe(p.scopes[1]!.count);
    expect(top.count).toBeLessThan(all.count);
    expect(top.gross).toBeLessThan(all.gross);
  }));

  it("an empty run totals nothing", () => each((c) => {
    expect(bonusTotals(bonusPlan(c), []).gross).toBe(0n);
  }));
});

describe("WPE bonus: words", () => {
  it("no authority wording, no raw dates", () => each((c) => {
    const { payDateIso: _iso, ...shown } = bonusPlan(c);
    const text = asText([shown, BONUS_BASIS]);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(text).not.toMatch(BANNED_WORDS);
    expect(AS_OF).toBe("2026-10-27");
    expect(BONUS_PAY_DATE).toBe("2026-10-30");
  }));
});
