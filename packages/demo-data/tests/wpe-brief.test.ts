import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  boardPack,
  employerCostView,
  gratuityProvision,
  headlineTotals,
  itDashboard,
  loans,
  loansReport,
  ownerBrief,
  payrollHistory,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const RAW_ISO = /\b\d{4}-\d{2}-\d{2}\b/;

describe("WPE owner brief (X25)", () => {
  it("repeats the run's own figures", () => each((c) => {
    const b = ownerBrief(c);
    const h = headlineTotals(c);
    const get = (id: string) => b.items.find((x) => x.id === id)!;
    expect(get("net").amount).toBe(h.net);
    expect(get("held").amount).toBe(h.heldNet);
    expect(get("issues").count).toBe(h.issuesOpen);
    expect(get("headcount").count).toBe(h.payslips);
    expect(get("settlement").amount).toBe(h.settlements);
  }));

  it("counts pending leave and expiring documents from the data", () =>
    each((c) => {
      const b = ownerBrief(c);
      const get = (id: string) => b.items.find((x) => x.id === id)!;
      expect(get("leave").count).toBe(c.leaveRequests
        .filter((r) => r.status === "pending").length);
      expect(get("docs-soon").count).toBe(c.documents
        .filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30).length);
    }));

  it("says no banned word, no raw date, keeps pension not computed", () =>
    each((c) => {
      const { asOf: _iso, ...shown } = ownerBrief(c);
      const t = asText(shown);
      expect(t).not.toMatch(BANNED_WORDS);
      expect(t).not.toMatch(RAW_ISO);
      expect(t).not.toContain("AED 0.00");
      expect(t).toMatch(/not computed/i);
    }));
});

describe("WPE board pack (X26)", () => {
  it("year to date is the history's own sum", () => each((c) => {
    const p = boardPack(c);
    expect(p.ytdGross).toBe(payrollHistory(c)
      .reduce((n, m) => n + m.gross, 0n));
    const get = (m: string) => p.rows.find((r) => r.measure.startsWith(m))!;
    expect(get("October gross").amount).toBe(headlineTotals(c).gross);
    expect(get("Gross plus employer").amount)
      .toBe(employerCostView(c).partialTotal);
    expect(get("Gratuity").amount).toBe(gratuityProvision(c).total);
  }));

  it("has no banned word and no raw date", () => each((c) => {
    const t = asText(boardPack(c));
    expect(t).not.toMatch(BANNED_WORDS);
    expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  }));
});

describe("WPE loans report (X11)", () => {
  it("lists every loan and owes only the open ones", () => each((c) => {
    const r = loansReport(c);
    const all = loans(c);
    expect(r.rows.map((x) => x.ref)).toEqual(all.map((l) => l.ref));
    expect(r.outstanding).toBe(all.filter((l) => l.status !== "closed")
      .reduce((n, l) => n + l.balance, 0n));
    expect(r.rows.find((x) => x.statusText === "Repaid")!.balance)
      .toBe(all.find((l) => l.status === "closed")!.balance);
  }));

  it("says agreed, never approved", () => each((c) => {
    const t = asText(loansReport(c));
    expect(t).not.toMatch(BANNED_WORDS);
    expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  }));
});

describe("WPE IT dashboard (X24)", () => {
  it("every row opens a named area and counts checks", () => each((c) => {
    const d = itDashboard(c);
    expect(d.rows.length).toBeGreaterThanOrEqual(6);
    for (const r of d.rows) expect(r.openId).toMatch(/^(setup|reports)\./);
    expect(d.checks).toBe(d.rows.filter((r) => r.state === "check").length);
  }));

  it("checks the chain and has no banned word", () => each((c) => {
    const d = itDashboard(c);
    expect(d.rows.find((r) => r.id === "chain")!.state).toBe("ok");
    const t = asText(d);
    expect(t).not.toMatch(BANNED_WORDS);
    expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  }));
});
