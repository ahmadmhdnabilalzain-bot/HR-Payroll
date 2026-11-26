import { describe, expect, it } from "vitest";
import {
  AS_OF,
  buildDemoCompany,
  costBudget,
  costByDepartment,
  meritPlan,
  payrollHistory,
  pendingJoiners,
  positionsByDepartment,
  workforcePlan,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const sum = (xs: readonly bigint[]) => xs.reduce((n, x) => n + x, 0n);

describe("WPE planning: cost and budget", () => {
  it("actual months are the history, October is the run", () => each((c) => {
    const b = costBudget(c);
    const h = payrollHistory(c);
    b.months.slice(0, 10).forEach((m, i) => {
      expect(m.kind).toBe("actual");
      expect(b.total.months[i]!.amount).toBe(h[i]!.gross);
    });
    expect(b.total.months[9]!.amount).toBe(c.payRun.totals.gross);
    const oct = new Map(costByDepartment(c).map((d) =>
      [d.departmentId, d.gross]));
    for (const r of b.rows) {
      expect(r.months[9]!.amount).toBe(oct.get(r.departmentId) ?? 0n);
    }
  }));

  it("departments add up to the company, every month", () => each((c) => {
    const b = costBudget(c);
    for (let i = 0; i < 12; i += 1) {
      expect(sum(b.rows.map((r) => r.months[i]!.amount)))
        .toBe(b.total.months[i]!.amount);
    }
    expect(sum(b.rows.map((r) => r.budgetYear))).toBe(b.total.budgetYear);
  }));

  it("November and December are labelled estimates", () => each((c) => {
    const b = costBudget(c);
    expect(b.total.months[10]!.kind).toBe("estimate");
    expect(b.total.months[11]!.kind).toBe("estimate");
    expect(b.forecastNote).toMatch(/estimates/);
  }));

  it("the forecast is not a copy of October", () => each((c) => {
    const b = costBudget(c);
    const oct = b.total.months[9]!.amount;
    expect(b.total.months[10]!.amount).not.toBe(oct);
  }));

  it("the bridge adds up to the next month", () => each((c) => {
    const b = costBudget(c);
    b.bridge.forEach((s, i) => {
      expect(s.fromAmount + sum(s.drivers.map((d) => d.amount)))
        .toBe(s.toAmount);
      expect(s.toAmount).toBe(b.total.months[10 + i]!.amount);
    });
  }));

  it("the leaver drops out and a joiner starts part-way", () => each(
    (c) => {
      const b = costBudget(c);
      const leaver = c.employees.find((e) => e.leavingDate !== null)!;
      const d = b.bridge[0]!.drivers;
      expect(d.find((x) => x.label === "Leavers drop out")!.people)
        .toContain(leaver.fullName);
      expect(d.some((x) => x.label.startsWith("New hires"))).toBe(true);
      expect(d.some((x) => x.label.startsWith("One-offs"))).toBe(true);
      const j = pendingJoiners(c);
      expect(j.length).toBeGreaterThan(0);
      const nov = b.bridge[0]!.drivers.find((x) =>
        x.label === "Accepted offers start")!;
      const dec = b.bridge[1]!.drivers.find((x) =>
        x.label === "Accepted offers start")!;
      expect(nov.amount).toBeGreaterThan(0n);
      expect(dec.amount).toBeGreaterThan(0n);
    }));
});

describe("WPE planning: workforce plan", () => {
  it("seats are the positions, department by department", () => each(
    (c) => {
      const p = workforcePlan(c);
      const seats = positionsByDepartment(c);
      for (const r of p.rows) {
        const s = seats.find((x) => x.departmentId === r.departmentId)!;
        expect([r.seats, r.filled, r.vacant, r.onHold])
          .toEqual([s.budgeted, s.filled, s.vacant, s.onHold]);
      }
      expect(p.totals.seats).toBe(p.rows.reduce((n, r) => n + r.seats, 0));
      expect(p.totals.filled + p.totals.vacant + p.totals.onHold)
        .toBe(p.totals.seats + p.totals.onHold);
    }));

  it("the budget parts add up and held seats stay out", () => each(
    (c) => {
      const p = workforcePlan(c);
      for (const r of p.rows) {
        expect(r.budget.filled + r.budget.backfill + r.budget.newHires)
          .toBe(r.budget.total);
      }
      expect(p.totals.budget).toBe(sum(p.rows.map((r) => r.budget.total)));
      expect(p.rows.find((r) => r.onHold > 0)!.unpriced).toBe(0);
    }));

  it("the leaver's seat is priced as a backfill", () => each((c) => {
    const p = workforcePlan(c);
    const leaver = c.employees.find((e) => e.leavingDate !== null)!;
    const row = p.rows.find((r) => r.departmentId ===
      leaver.departmentId)!;
    expect(row.budget.backfill).toBeGreaterThan(0n);
    expect(p.leavers[0]!.seatText).toMatch(/replacement/);
  }));

  it("a seat with no accepted offer is counted, not priced", () => each(
    (c) => {
      const p = workforcePlan(c);
      expect(p.totals.unpriced).toBeGreaterThan(0);
      expect(p.totals.vacant).toBeGreaterThan(0);
    }));
});

describe("WPE planning: merit guideline", () => {
  it("steps follow the rating and stop at the band top", () => each(
    (c) => {
      const m = meritPlan(c);
      for (const r of m.rows) {
        expect(r.allowedSteps).toBeLessThanOrEqual(r.guidelineSteps);
        if (r.rating === null) expect(r.noneReason).toMatch(/Not rated/);
        if (r.noneReason !== null) expect(r.allowedSteps).toBe(0);
      }
      expect(m.rows.some((r) => r.allowedSteps > 0)).toBe(true);
    }));

  it("the leaver is left out in words; pools count rated staff", () =>
    each((c) => {
      const m = meritPlan(c);
      const leaver = c.employees.find((e) => e.leavingDate !== null)!;
      expect(m.rows.some((r) => r.employeeId === leaver.id)).toBe(false);
      expect(m.left[0]!.name).toBe(leaver.fullName);
      for (const p of m.pools) {
        expect(p.poolSteps).toBe(p.eligible * 1);
      }
    }));
});

describe("WPE planning: words", () => {
  it("no authority wording, no raw dates, no AED 0.00", () => each((c) => {
    const text = asText([meritPlan(c), workforcePlan(c), costBudget(c)]);
    expect(text).not.toMatch(BANNED_WORDS);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}"/);
    expect(text).not.toContain("AED 0.00");
    expect(AS_OF).toBe("2026-10-27");
  }));
});
