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
