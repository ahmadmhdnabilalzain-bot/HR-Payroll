import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  checkDays,
  clockSites,
  dailyRate,
  encashable,
  encashQuote,
  askSeeds,
  exitInterviews,
  leaveLiability,
  leaveSafeCheck,
  onFile,
  phonePunches,
  signDocs,
  wfhRows,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
/** Display strings only: ISO dates live in `iso` fields. */
const shown = (x: unknown): string => asText(x)
  .replace(/"(iso|id)":"[^"]*"/g, "");

describe("WPE exit interviews", () => {
  it("one per leaver, from the checklist, naming the resignation reason",
    () => each((c) => {
      const x = exitInterviews(c);
      expect(x).toHaveLength(1);
      expect(x[0]!.held).toBe(true);
      expect(x[0]!.reasonNote).toBe("Moving abroad to another bank");
      expect(x[0]!.reasonId).toBe("relocation");
    }));
});

describe("WPE signatures and files", () => {
  it("every letter and offer is a signing document", () => each((c) => {
    const d = signDocs(c);
    expect(d.filter((x) => x.kind === "letter")).toHaveLength(4);
    expect(d.every((x) => x.signerName !== "")).toBe(true);
    expect(d.some((x) => x.base === "waiting")).toBe(true);
  }));
  it("a paper on file for each document, as version 1", () => each((c) => {
    const f = onFile(c);
    expect(f).toHaveLength(c.documents.length);
    expect(f.every((x) => x.first.version === 1)).toBe(true);
  }));
});

describe("WPE leave pay", () => {
  it("the amount is days times one day of basic, rounded once",
    () => each((c) => {
      for (const p of encashable(c)) {
        const e = c.employees.find((x) => x.id === p.employeeId)!;
        const q = encashQuote(c, p.employeeId, p.availableHalves);
        expect(q.ok).toBe(true);
        expect(q.rate).toBe(dailyRate(c, p.employeeId));
        // half-up of basic x halves / 60, within one fils of the rate
        const exact = (e.basicMonthly * BigInt(p.availableHalves)) / 60n;
        expect(q.amount >= exact && q.amount <= exact + 1n).toBe(true);
      }
    }));
  it("refuses more than is left, nothing for the leaver", () => each((c) => {
    const p = encashable(c)[0]!;
    expect(encashQuote(c, p.employeeId, p.availableHalves + 1).ok)
      .toBe(false);
    expect(encashQuote(c, p.employeeId, 0).ok).toBe(false);
    expect(encashable(c).some((x) => x.employeeId === "emp-014"))
      .toBe(false);
    expect(encashQuote(c, "emp-014", 2).ok).toBe(false);
  }));
  it("the liability is the sum of the same quotes", () => each((c) => {
    for (const r of leaveLiability(c)) {
      expect(r.liability).toBe(encashQuote(c, r.employeeId,
        r.days * 2).amount);
    }
  }));
  it("sample requests sit within the balance", () => each((c) => {
    for (const a of askSeeds(c)) {
      expect(encashQuote(c, a.employeeId, Number(a.values["halves"])).ok)
        .toBe(true);
    }
  }));
});

describe("WPE time extras", () => {
  it("days to check are October absences and late arrivals", () => {
    const c = buildDemoCompany();
    const d = checkDays(c);
    expect(d.filter((x) => x.was === "Absent, unpaid")).toHaveLength(3);
    expect(d.every((x) => x.date.iso.startsWith("2026-10"))).toBe(true);
  });
  it("sites, phone punches and work from home read the attendance", () => {
    const c = buildDemoCompany();
    expect(clockSites(c).reduce((n, s) => n + s.staff, 0))
      .toBe(c.employees.filter((e) => e.leavingDate === null).length);
    expect(phonePunches(c).every((p) => p.inside)).toBe(true);
    const w = wfhRows(c);
    expect(w.some((r) => r.over)).toBe(true);
    expect(w.every((r) => r.over === r.days > r.allowed)).toBe(true);
  });
  it("the roster check is quiet today and prices a second leave", () => {
    const c = buildDemoCompany();
    expect(leaveSafeCheck(c).days).toHaveLength(0);
    const r = leaveSafeCheck(c, { employeeId: "emp-017",
      from: "2026-11-16", to: "2026-11-17" });
    expect(r.days.length).toBeGreaterThan(0);
    expect(r.total > 0n).toBe(true);
  });
});

describe("WPE words", () => {
  it("no authority words and no raw dates in what screens show", () =>
    each((c) => {
      const all = [exitInterviews(c), signDocs(c), onFile(c), encashable(c),
        leaveLiability(c), checkDays(c), clockSites(c), phonePunches(c),
        wfhRows(c), leaveSafeCheck(c, { employeeId: "emp-017",
          from: "2026-11-16", to: "2026-11-17" }), askSeeds(c)];
      const text = shown(all);
      expect(text).not.toMatch(BANNED_WORDS);
      expect(text).not.toMatch(ISO);
    }));
});
