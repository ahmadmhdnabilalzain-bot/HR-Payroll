import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGES = join(import.meta.dirname, "..", "..");
const ENGINE_TAX = join(PACKAGES, "engine", "src", "tax");

/** Plan 12 product folders (Tasks 6 to 13); skipped while absent. */
const PRODUCT_DIRS = [
  join(PACKAGES, "api", "src", "tax"),
  join(PACKAGES, "api", "src", "einvoicing"),
  join(PACKAGES, "contract", "src", "tax"),
];

/** Statutory figures that live only in the engine rule-packs. */
const FIGURES = ["37500000", "300000000", "5000000000", "\"2026-10-30\"",
  "\"2027-03-31\"", "\"2027-07-01\"", "\"0235\""];

/** Product wording the Global Constraints ban (case-insensitive). */
const BANNED_WORDS = ["compliant", "FTA approved", "certified",
  "submitted to the FTA", "filed with the FTA", "recoverable",
  "claimable", "5%", "9%", "tax advice"];

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listTs(path);
    return e.name.endsWith(".ts") ? [path] : [];
  });
}

export function figureHits(text: string): string[] {
  return FIGURES.filter((f) => text.includes(f));
}

/** "not tax advice" is the one allowed use of "tax advice". */
export function bannedWordHits(text: string): string[] {
  const lower = text.toLowerCase().split("not tax advice").join("");
  return BANNED_WORDS.filter((w) => lower.includes(w.toLowerCase()));
}

describe("scanners", () => {
  it("flag planted figures", () => {
    expect(figureHits("const x = 37500000;")).toEqual(["37500000"]);
    expect(figureHits('d = "2027-07-01"; s = "0235"')).toEqual(
      ["\"2027-07-01\"", "\"0235\""]);
    expect(figureHits("const x = 3750000;")).toEqual([]);
  });
  it("flag planted banned words", () => {
    expect(bannedWordHits("Your return is Compliant")).toEqual(
      ["compliant"]);
    expect(bannedWordHits("VAT is RECOVERABLE at 5%")).toEqual(
      ["recoverable", "5%"]);
    expect(bannedWordHits("Submitted to the FTA")).toEqual(
      ["submitted to the FTA"]);
    expect(bannedWordHits("This is not tax advice.")).toEqual([]);
    expect(bannedWordHits("This is tax advice.")).toEqual(["tax advice"]);
    expect(bannedWordHits("claimable; FTA approved; certified; 9%; " +
      "filed with the FTA")).toHaveLength(5);
  });
});

describe("engine tax functions hold no statutory figure", () => {
  it.skipIf(!existsSync(ENGINE_TAX))("src/tax", () => {
    const files = listTs(ENGINE_TAX);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(figureHits(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });
});

describe("product tax code holds no figure and no banned word", () => {
  for (const dir of PRODUCT_DIRS) {
    it.skipIf(!existsSync(dir))(dir, () => {
      for (const file of listTs(dir)) {
        const text = readFileSync(file, "utf8");
        expect(figureHits(text), file).toEqual([]);
        expect(bannedWordHits(text), file).toEqual([]);
      }
    });
  }
});
