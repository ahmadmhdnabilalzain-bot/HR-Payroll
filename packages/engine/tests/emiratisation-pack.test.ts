import { describe, expect, it } from "vitest";
import {
  EMIRATISATION_DISCLAIMER,
  EMIRATISATION_OVERRIDABLE,
  EMIRATISATION_PACKS,
  FINE_2026_NOTE,
} from "../src/rules/emiratisation-pack";
import { selectPack } from "../src/rules/select";

const PACK = EMIRATISATION_PACKS[0]!;

const KEYS = [
  "bandLargeMinHeadcount", "bandMidMinHeadcount", "largeCheckpoints",
  "midCheckpoints", "largeTargetBps_2025-06-30",
  "largeTargetBps_2025-12-31", "largeTargetBps_2026-06-30",
  "largeTargetBps_2026-12-31", "largeRequiredRounding",
  "largeCountSkilledNationalsOnly", "midRequired_2025-12-31",
  "midRequired_2026-12-31", "minWageFils", "minWageCountingFrom",
  "minWageBase", "finePerPostPerYear_2025", "finePerPostPerYear_2026",
];

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

describe("ae-emiratisation pack", () => {
  it("has exactly the table's 17 keys", () => {
    expect(Object.keys(PACK.params).sort()).toEqual([...KEYS].sort());
    expect(KEYS).toHaveLength(17);
  });
  it("keeps every unsourced param empty", () => {
    for (const [key, p] of Object.entries(PACK.params)) {
      if (p.status !== "unsourced") continue;
      expect(p.value, key).toBeNull();
      expect(p.source, key).toBeNull();
    }
  });
  it("has no official param", () => {
    for (const p of Object.values(PACK.params)) {
      expect(p.status).not.toBe("official");
    }
  });
  it("lists exactly the unsourced keys as overridable", () => {
    const unsourced = Object.entries(PACK.params)
      .filter(([, p]) => p.status === "unsourced").map(([k]) => k);
    expect(unsourced.sort()).toEqual([...EMIRATISATION_OVERRIDABLE].sort());
  });
  it("cites the research note for secondary values", () => {
    for (const [key, p] of Object.entries(PACK.params)) {
      if (p.status !== "secondary") continue;
      expect(p.source?.note, key).toContain(
        "2026-11-25-gpssa-emiratisation-nafis.md");
    }
  });
  it("covers 2025 and 2026 only", () => {
    expect(codeOf(() => selectPack(EMIRATISATION_PACKS, "2024-12-31")))
      .toBe("NO_PACK_FOR_DATE");
    expect(codeOf(() => selectPack(EMIRATISATION_PACKS, "2027-01-01")))
      .toBe("NO_PACK_FOR_DATE");
    expect(selectPack(EMIRATISATION_PACKS, "2026-12-31").id)
      .toBe("ae-emiratisation");
  });
  it("keeps the plan's exact note and disclaimer", () => {
    expect(FINE_2026_NOTE).toBe("The 2026 fine per unfilled post is " +
      "unresolved: sources give AED 9,000 and AED 10,000 a month. " +
      "Enter a figure to see an estimate.");
    expect(EMIRATISATION_DISCLAIMER).toBe("Planning estimate from " +
      "secondary sources. Not legal advice. Confirm targets and " +
      "counting rules with MOHRE.");
  });
  it("is frozen", () => {
    expect(Object.isFrozen(EMIRATISATION_PACKS)).toBe(true);
    expect(Object.isFrozen(PACK.params.minWageFils)).toBe(true);
  });
});
