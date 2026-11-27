import { describe, expect, it } from "vitest";
import {
  accountMapping,
  buildDemoCompany,
  costCentres,
  employeeSync,
  erpPages,
  payrollJournal,
  postingCsv,
  postingPreview,
  teamsCards,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE ERP, ledger and Teams (S43, S35, S36)", () => {
  it("three pages, each says nothing is connected, switches Off", () =>
    each((c) => {
      const pages = erpPages(c);
      expect(pages.map((p) => p.id)).toEqual(["erp", "gl", "teams"]);
      for (const p of pages) {
        expect(p.notice).toMatch(/Nothing is connected/);
        expect(p.testResult).toMatch(/Not connected/);
        const items = p.groups.flatMap((g) => g.items);
        expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
        for (const i of items) {
          if (i.choices !== null) expect(i.choices).toContain(i.value);
          if (/switch$/.test(i.key)) expect(i.value).toBe("Off");
        }
      }
    }));

  it("every journal line has an account and a cost centre", () =>
    each((c) => {
      const p = postingPreview(c);
      expect(p.unmapped).toEqual([]);
      expect(p.lines.length).toBe(payrollJournal(c).lines.length);
      const codes = new Set(costCentres(c).map((x) => x.code));
      for (const l of p.lines) {
        expect(l.account).not.toBe("");
        expect(codes.has(l.costCentre)).toBe(true);
      }
      expect(accountMapping().every((m) => m.account !== "")).toBe(true);
    }));

  it("totals equal the journal's and balance", () => each((c) => {
    const j = payrollJournal(c);
    const p = postingPreview(c);
    expect(p.debits).toBe(j.debits);
    expect(p.credits).toBe(j.credits);
    expect(p.balanced).toBe(true);
    const csv = postingCsv(p).split("\r\n");
    expect(csv.length).toBe(p.lines.length + 1);
    const sum = (col: number): bigint => csv.slice(1).reduce((n, r) => {
      const v = r.split('","')[col]!.replace(/"/g, "");
      return v === "" ? n : n + BigInt(v.replace(".", ""));
    }, 0n);
    expect(sum(6)).toBe(BigInt(j.debits));
    expect(sum(7)).toBe(BigInt(j.credits));
  }));

  it("employee sync carries no pay and no ID numbers", () => each((c) => {
    const rows = employeeSync(c);
    expect(rows.length).toBe(5);
    expect(Object.keys(rows[0]!)).toEqual(["number", "name", "department",
      "costCentre", "joined"]);
  }));

  it("Teams cards come from the waiting requests", () => each((c) => {
    const cards = teamsCards(c);
    expect(cards.length).toBe(Math.min(3, c.approvals.length));
    expect(cards.length).toBeGreaterThan(0);
  }));

  it("addresses are .test, tokens masked, no banned word or raw date",
    () => each((c) => {
      const t = asText([erpPages(c), postingPreview(c), teamsCards(c),
        employeeSync(c)]);
      expect(t).not.toMatch(/https?:\/\/[^ "]*\.(com|ae|org|net)\b/);
      expect(t).toMatch(/\*{8}/);
      expect(t).not.toMatch(BANNED_WORDS);
      expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
      expect(t).not.toMatch(/compliant|certified|partner|SAP|Oracle|Xero/i);
    }));
});
