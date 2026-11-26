import { describe, expect, it } from "vitest";
import {
  holidayDatesLoaded,
  ruleOf,
  ruleRows,
  statusCounts,
  valueWords,
} from "../../src/setup/rules/data";
import { limitError, parseChoice } from "../../src/setup/rules/RuleSettings";
import { plainOf } from "../../src/setup/rules/words";
import {
  choiceOf,
  reduceRules,
  RULES_INITIAL,
} from "../../src/setup/rules/state";

describe("setup rules", () => {
  it("lists every rule with a status, a sentence and a pack", () => {
    const rows = ruleRows();
    expect(rows.length).toBeGreaterThan(60);
    for (const r of rows) {
      expect(r.text.length).toBeGreaterThan(5);
      expect(r.packName).not.toBe("");
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    const n = statusCounts();
    expect(Object.values(n).reduce((a, b) => a + b, 0)).toBe(rows.length);
  });
  it("unsourced rules hold no value and no source", () => {
    const u = ruleRows().filter((r) => r.status === "unsourced");
    expect(u.length).toBeGreaterThan(0);
    for (const r of u) {
      expect(r.raw).toBeNull();
      expect(r.sourceNote).toBeNull();
    }
  });
  it("shows the 50% limit as secondary, as the explain panel does", () => {
    expect(ruleOf("ae-payroll", "deductionOverallCapBps").status)
      .toBe("secondary");
  });
  it("excludes pension keys and finds no holiday dates", () => {
    expect(ruleRows().some((r) => /^gpssa/.test(r.key))).toBe(false);
    expect(holidayDatesLoaded()).toBe(0);
  });
  it("words values by unit", () => {
    expect(valueWords("overtimeUpliftBps", 2500)).toBe("25%");
    expect(valueWords("timeMaxNormalMinutesPerDay", 480)).toBe("8 hours");
    expect(valueWords("x", null)).toBe("Not set");
    expect(valueWords("capYearsOfWage", 2)).toBe("2 years of wage");
    expect(valueWords("capYearsOfWage", 1)).toBe("1 year of wage");
    expect(plainOf("zzzUnknownKey")).toBe("Zzz unknown key.");
  });
  it("holds a choice to the law's limit", () => {
    const e = { unit: "%" as const, min: 25, why: "The law gives at least" };
    expect(parseChoice("30%", "%")).toBe(30);
    expect(parseChoice("30 days", "%")).toBeNull();
    expect(limitError(20, e)).toContain("at least 25%");
    expect(limitError(25, e)).toBeNull();
  });
  it("records a choice and undoes it", () => {
    const s = reduceRules(RULES_INITIAL, { type: "rule-edit", edit: {
      key: "k", value: 3, what: "w", who: "a", role: "r", on: "2026-10-27" } });
    expect(choiceOf(s.ruleEdits, "k")?.value).toBe(3);
    const u = reduceRules(s, { type: "rule-undo", id: 1 });
    expect(choiceOf(u.ruleEdits, "k")).toBeNull();
    expect(u.ruleEdits).toHaveLength(1);
  });
});
