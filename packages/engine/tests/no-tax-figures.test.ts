import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGES = join(import.meta.dirname, "..", "..");
const ENGINE_TAX = join(PACKAGES, "engine", "src", "tax");
const API = join(PACKAGES, "api", "src");
const CONTRACT = join(PACKAGES, "contract", "src");
const ROUTES_VAT = join(CONTRACT, "routes-vat.ts");

/** Plan 12 product folders of VAT, tax and e-invoicing text. */
const PRODUCT_DIRS = [join(API, "tax"), join(API, "einvoicing"),
  join(CONTRACT, "tax"), join(CONTRACT, "einvoicing")];

/** Product files outside those folders, by name pattern. */
const PRODUCT_FILES: [string, RegExp][] = [
  [CONTRACT, /^routes-(vat|tax|einvoic).*\.ts$/],
  [join(API, "routes"), /^(vat|tax|einvoic).*\.ts$/],
];

/** Statutory figures that live only in the engine rule-packs. */
const FIGURES = ["37500000", "300000000", "5000000000", "\"2026-10-30\"",
  "\"2027-03-31\"", "\"2027-07-01\"", "\"0235\""];

/** Product wording the Global Constraints ban, with variants. */
const BANNED: [string, RegExp][] = [
  ["compliant", /compliant/],
  ["FTA approved", /fta[\s-]*approved/],
  ["certified", /certified/],
  ["submitted to the FTA", /submitted\s+to\s+(the\s+)?fta/],
  ["filed with the FTA", /filed\s+with\s+(the\s+)?fta/],
  ["recoverable", /recoverable/],
  ["claimable", /claimable/],
  ["recover input tax", /recover(s|ed|ing)?\s+(the\s+)?input\s+tax/],
  ["5%", /(?<![\d.])5\s*%|five\s+per\s*cent/],
  ["9%", /(?<![\d.])9\s*%|nine\s+per\s*cent/],
  ["tax advice", /tax\s+advice/],
];

/** The FTA's own Box 13 label, quoted in the engine (Ruling 4). */
const ALLOWED_ENGINE = ["total value of recoverable tax"];

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listTs(path);
    return e.name.endsWith(".ts") ? [path] : [];
  });
}

export function productFiles(): string[] {
  const inDirs = PRODUCT_DIRS.filter(existsSync).flatMap(listTs);
  const named = PRODUCT_FILES.filter(([dir]) => existsSync(dir))
    .flatMap(([dir, re]) => readdirSync(dir)
      .filter((n) => re.test(n)).map((n) => join(dir, n)));
  return [...inDirs, ...named];
}

export function figureHits(text: string): string[] {
  return FIGURES.filter((f) => text.includes(f));
}

/** URLs and percent-encoded bytes are not wording ("2015%20"). */
function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/g, " ")
    .replace(/%[0-9a-f]{2}/gi, " ");
}

/** "not tax advice" is the one allowed use of "tax advice". */
export function bannedWordHits(text: string,
  allowed: readonly string[] = []): string[] {
  let lower = stripUrls(text).toLowerCase()
    .split("not tax advice").join(" ");
  for (const a of allowed) lower = lower.split(a).join(" ");
  return BANNED.filter(([, re]) => re.test(lower)).map(([n]) => n);
}

describe("scanners", () => {
  it("flag planted figures", () => {
    expect(figureHits("const x = 37500000;")).toEqual(["37500000"]);
    expect(figureHits('d = "2027-07-01"; s = "0235"')).toEqual(
      ["\"2027-07-01\"", "\"0235\""]);
    expect(figureHits("const x = 3750000;")).toEqual([]);
  });
  it("flag planted banned words and their variants", () => {
    expect(bannedWordHits("Your return is Compliant")).toEqual(
      ["compliant"]);
    expect(bannedWordHits("VAT is RECOVERABLE at 5%")).toEqual(
      ["recoverable", "5%"]);
    expect(bannedWordHits("Submitted to the FTA")).toEqual(
      ["submitted to the FTA"]);
    expect(bannedWordHits("submitted to FTA")).toEqual(
      ["submitted to the FTA"]);
    expect(bannedWordHits("an FTA-approved provider")).toEqual(
      ["FTA approved"]);
    expect(bannedWordHits("rate 5 %")).toEqual(["5%"]);
    expect(bannedWordHits("five per cent")).toEqual(["5%"]);
    expect(bannedWordHits("nine percent")).toEqual(["9%"]);
    expect(bannedWordHits("you can recover input tax")).toEqual(
      ["recover input tax"]);
    expect(bannedWordHits("This is not tax advice.")).toEqual([]);
    expect(bannedWordHits("This is tax advice.")).toEqual(["tax advice"]);
    expect(bannedWordHits("claimable; FTA approved; certified; 9%; " +
      "filed with FTA")).toHaveLength(5);
  });
  it("do not trip on URLs or other percentages", () => {
    expect(bannedWordHits("see https://x.ae/a%2015%20b.pdf")).toEqual([]);
    expect(bannedWordHits('"Guide%20V4" + "2025%20b"')).toEqual([]);
    expect(bannedWordHits("15% and 0.5% and 95%")).toEqual([]);
    expect(bannedWordHits("Total value of recoverable tax",
      ALLOWED_ENGINE)).toEqual([]);
  });
});

describe("engine tax functions", () => {
  const files = existsSync(ENGINE_TAX) ? listTs(ENGINE_TAX) : [];
  it("exist and hold no statutory figure", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(figureHits(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });
  it("hold no banned wording beyond the quoted FTA label", () => {
    for (const file of files) {
      expect(bannedWordHits(readFileSync(file, "utf8"), ALLOWED_ENGINE),
        file).toEqual([]);
    }
  });
});

describe("product tax code holds no figure and no banned word", () => {
  it("scans every VAT, tax and e-invoicing product file", () => {
    for (const file of productFiles()) {
      const text = readFileSync(file, "utf8");
      expect(figureHits(text), file).toEqual([]);
      expect(bannedWordHits(text), file).toEqual([]);
    }
  });
  it("finds the product files once Task 6 has merged", () => {
    if (!existsSync(ROUTES_VAT)) return;
    expect(productFiles()).toContain(ROUTES_VAT);
    expect(existsSync(join(CONTRACT, "tax")), "contract/src/tax")
      .toBe(true);
    expect(existsSync(join(API, "tax")), "api/src/tax").toBe(true);
  });
});
