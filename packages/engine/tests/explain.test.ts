import { describe, expect, it } from "vitest";
import { MESSAGES, type Lang } from "../src/explain/catalog";
import { explainTrace } from "../src/explain/explain";
import { calculateGratuity } from "../src/gratuity";
import type { GratuityInput } from "../src/gratuity";
import { fils } from "../src/money";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";
import { calculateSettlement } from "../src/settlement";
import type { TraceLine } from "../src/trace-types";

const input = (more: Partial<GratuityInput> = {}): GratuityInput => ({
  joiningDate: "2019-01-01",
  lastWorkingDate: "2023-12-31",
  unpaidLeaveDays: 0,
  lastBasicMonthly: fils(1000000n),
  workerClass: "expat-full-time",
  ...more,
});
const settle = (more: Partial<GratuityInput> = {}) =>
  calculateSettlement({ gratuity: input(more), unusedLeaveDays: 10 },
    GRATUITY_PACKS).trace;
const langs: Lang[] = ["en", "ar"];
const IDS = ["service.days", "service.years", "gratuity.tier1",
  "gratuity.tier2", "gratuity.cap", "gratuity.total", "leave.pay",
  "settlement.total"];

describe("explainTrace", () => {
  it("english shows the amount and the rule status", () => {
    const out = explainTrace(settle(), "en");
    expect(out).toContain("35,000");
    expect(out).toContain("official");
    expect(out.split("\n")).toHaveLength(8);
  });
  it("arabic shows the same digits and differs from english", () => {
    const ar = explainTrace(settle(), "ar");
    expect(ar).toContain("35,000");
    expect(ar).not.toBe(explainTrace(settle(), "en"));
  });
  it("has a message in both languages for every emitted id", () => {
    const traces = [settle(), settle({ workerClass: "uae-national" }),
      settle({ joiningDate: "2023-06-01" }),
      calculateGratuity(input(), GRATUITY_PACKS).trace];
    const emitted = new Set([...IDS, ...traces.flat().map((l) => l.id)]);
    for (const lang of langs) {
      for (const id of emitted) {
        expect(MESSAGES[lang][id], `${lang} ${id}`).toBeTruthy();
      }
      expect(explainTrace(traces.flat(), lang)).not.toContain(
        "[untranslated]");
    }
  });
  it("localises the years line in arabic", () => {
    const line = explainTrace(settle(), "ar").split("\n")[1] ?? "";
    expect(line).not.toMatch(/years|days/);
    expect(line).toContain("5");
    expect(explainTrace(settle(), "en")).toContain("5 years and 0 days");
  });
  it("uses arabic status words and isolates amounts", () => {
    const ar = explainTrace(settle(), "ar");
    expect(ar).toContain("رسمي");
    expect(ar).toContain("\u2066AED 35,000.00\u2069");
  });
  it("leaves no placeholder and ends with statuses", () => {
    const all = [...settle(), ...settle({ workerClass: "uae-national" })];
    for (const lang of langs) {
      for (const l of explainTrace(all, lang).split("\n")) {
        expect(l).not.toMatch(/[{}]/);
        expect(l).toMatch(/\([^()]+\)\.$/);
      }
    }
  });
  it("national: english gives the pension reason, not a bare zero", () => {
    const lines = explainTrace(settle({ workerClass: "uae-national" }),
      "en").split("\n");
    const g = lines.find((l) => l.startsWith("End-of-service"))!;
    expect(g).toContain("AED 0.00");
    expect(g).toMatch(/not applicable/);
    expect(g).toMatch(/pension legislation/);
    expect(g).toMatch(/\(official\)\.$/);
    expect(g).not.toMatch(/no rules/);
  });
  it("national: arabic gives the pension reason", () => {
    const g = explainTrace(settle({ workerClass: "uae-national" }), "ar")
      .split("\n")[2] ?? "";
    expect(g).toContain("لا تنطبق");
    expect(g).toContain("المعاشات");
    expect(g).toContain("(رسمي).");
    expect(g).not.toMatch(/[a-z]{3,}/);
  });
  it("under one year: both languages give years and the minimum", () => {
    const t = settle({ joiningDate: "2023-06-01" });
    const en = explainTrace(t, "en").split("\n")[2] ?? "";
    expect(en).toContain(
      "not eligible: 0 completed years is below the minimum of 1");
    expect(en).toContain("AED 0.00");
    const ar = explainTrace(t, "ar").split("\n")[2] ?? "";
    expect(ar).toContain("غير مستحقة");
    expect(ar).toMatch(/0 .* 1/);
    expect(ar).not.toMatch(/[a-z]{3,}/);
  });
  it("the total line names what it leaves out", () => {
    const en = explainTrace(settle(), "en");
    expect(en).toContain("Computed total (excludes notice pay, " +
      "deductions and other dues): AED 38,333.33");
    expect(en).not.toMatch(/final/i);
    expect(explainTrace(settle(), "ar")).not.toContain("النهائية");
  });
  it("arabic convention word is the engine's choice, not custom", () => {
    const ar = explainTrace(settle(), "ar");
    expect(ar).toContain("اختيار النظام");
    expect(ar).not.toMatch(/(^|[ (،,])عرف([ ),.،]|$)/m);
  });
  it("leap-day joiner: service line is not called official alone", () => {
    const t = settle({ joiningDate: "2024-02-29",
      lastWorkingDate: "2025-02-27" });
    const en = explainTrace(t, "en").split("\n")[1] ?? "";
    expect(en).toMatch(/^Completed service: 1 years and 0 days/);
    expect(en).toContain("convention");
    expect(en).not.toMatch(/\(official\)\.$/);
    expect(explainTrace(t, "ar").split("\n")[1]).toContain(
      "اختيار النظام");
  });
  it("marks an unknown id as untranslated", () => {
    const line: TraceLine = { id: "nope.x", label: "Mystery", formula: "",
      inputs: {}, result: "7", rules: [] };
    for (const lang of langs) {
      const out = explainTrace([line], lang);
      expect(out).toContain("[untranslated]");
      expect(out).toContain("Mystery");
    }
  });
});
