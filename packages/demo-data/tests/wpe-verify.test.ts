import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  intakeSamples,
  letterCodeOf,
  lookupLetter,
  VERIFY_NOTE,
  verifiableLetters,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const shown = (x: unknown): string => asText(x)
  .replace(/"(iso|id|employeeId)":"[^"]*"/g, "");

describe("WPE verifiable letters", () => {
  it("codes are short, stable and unique", () => each((c) => {
    const v = verifiableLetters(c);
    expect(v.length).toBeGreaterThanOrEqual(4);
    expect(new Set(v.map((x) => x.code)).size).toBe(v.length);
    for (const x of v) {
      expect(x.code).toMatch(/^VL-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      expect(x.code).toBe(letterCodeOf(x.id, x.employeeId));
    }
  }));
  it("only salary certificates and no-objection letters, and the issued"
    + " sample letter is among them", () => each((c) => {
    const v = verifiableLetters(c);
    expect(v.every((x) => x.kind === "salary-certificate" ||
      x.kind === "noc")).toBe(true);
    expect(v.some((x) => x.id === "lt-1" && x.status === "valid")).toBe(true);
    expect(v.some((x) => x.status === "withdrawn")).toBe(true);
  }));
  it("a right code finds the letter, any spacing or case", () => each((c) => {
    const v = verifiableLetters(c);
    const x = v.find((l) => l.status === "valid")!;
    const r = lookupLetter(v, ` ${x.code.toLowerCase().replace(/-/g, " ")}`);
    expect(r.found).toBe(true);
    expect(r.found && r.letter.id).toBe(x.id);
  }));
  it("a wrong code is not found", () => each((c) => {
    const v = verifiableLetters(c);
    expect(lookupLetter(v, "VL-AAAA-BBBB").found).toBe(false);
    expect(lookupLetter(v, "").found).toBe(false);
  }));
  it("the public statement has no pay figure", () => each((c) => {
    const v = verifiableLetters(c);
    const text = shown(v);
    expect(text).not.toMatch(/AED|salary of|a month|\d{1,3},\d{3}/);
    expect(text).not.toMatch(/monthlySalary/);
  }));
  it("says issued by the company, with the date and the person",
    () => each((c) => {
      for (const x of verifiableLetters(c)) {
        expect(x.statement).toContain(`Issued by ${c.company.name} on `);
        expect(x.statement).toContain(` for ${x.name}, `);
        expect(x.statement).toContain(x.display.kind.toLowerCase());
      }
    }));
  it("no banned words, no raw dates on show", () => each((c) => {
    const t = shown([verifiableLetters(c), VERIFY_NOTE]);
    expect(t).not.toMatch(BANNED_WORDS);
    expect(t).not.toMatch(ISO);
  }));
});

describe("WPE document intake samples", () => {
  it("each has a source, a time, who received it and where it went",
    () => each((c) => {
      const s = intakeSamples(c);
      expect(s.length).toBeGreaterThanOrEqual(5);
      expect(new Set(s.map((x) => x.source))).toEqual(
        new Set(["email", "upload", "hr"]));
      for (const x of s) {
        expect(x.receivedBy).not.toBe("");
        expect(x.display.time).toMatch(/^\d{2}:\d{2}$/);
        expect(x.display.filedTo).not.toBe("");
      }
      expect(s.some((x) => x.employeeId === null)).toBe(true);
    }));
  it("filed samples name a person who exists and a type", () => each((c) => {
    for (const x of intakeSamples(c).filter((i) => i.employeeId !== null)) {
      expect(c.employees.some((e) => e.id === x.employeeId)).toBe(true);
      expect(x.docType).not.toBeNull();
    }
  }));
  it("no banned words, no raw dates, no real-looking addresses",
    () => each((c) => {
      const t = shown(intakeSamples(c));
      expect(t).not.toMatch(BANNED_WORDS);
      expect(t).not.toMatch(ISO);
      for (const m of t.match(/[\w.]+@[\w.-]+/g) ?? []) {
        expect(m).toMatch(/@zarqan-demo\.test$/);
      }
    }));
});
