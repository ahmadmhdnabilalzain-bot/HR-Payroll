/**
 * Finds money that reads as a figure in a piece of text (a leak while
 * amounts are hidden). Pure and import-free so the unit and e2e route
 * scans share it with the masker. <Money/> and maskMoney() write
 * "AED ••••••", which is not a match: only digits after AED count.
 */
const AR = "\\u0660-\\u0669\\u06f0-\\u06f9";
const D = `[\\d${AR}]`;

const RULES: readonly [string, RegExp][] = [
  ["aed", new RegExp(`(?:AED|\\u062f\\.\\u0625|\\u062f\\u0631\\u0647\\u0645)` +
    `[\\s\\u00a0\\u202f]*[+\\u2212-]?${D}`, "g")],
  ["amount-aed-after", new RegExp(`(?<![\\w.,]|${D} )${D}[\\d,.${AR}]*` +
    `[ \\u00a0\\u202f]*(?:AED|\\u062f\\.\\u0625)`, "g")],
  ["thousands", new RegExp(`(?<![\\d.,])${D}{1,3}(?:[,\\u066c]${D}{3})+` +
    `(?:[.\\u066b]${D}+)?`, "g")],
  // Not a rating ("4.50 out of 5") or a multiplier ("1.25x").
  ["decimal-2", new RegExp(`(?<![\\d.,])${D}{3,}\\.${D}{2}` +
    `(?![\\d%.]|x\\b|\\s*(?:out of|of 5|stars?|days?|hours?|h\\b))`, "g")],
  // Not part of a grouped code (IBAN, card, reference: "9990 0000"),
  // nor a ledger code ("2110 Salaries payable").
  ["bare-1000", new RegExp("(?<![\\w.,#/:*-]|\u2022 |ending |" +
    `[\\da-f]{4}[ \\t]|${D} )${D}{4,}` +
    `(?![\\w.,:/-]|%|[ \\t][\\da-f]{4}\\b|[ \\t][A-Z][a-z])`, "g")],
];

/** A bare four-digit number that is plainly a year. */
const YEAR = /^(?:19|20)\d\d$/;

/** The unmasked figures in `text`, as [rule, match] pairs. */
export function findMoney(text: string): [string, string][] {
  const out: [string, string][] = [];
  for (const [rule, re] of RULES) {
    for (const m of text.matchAll(re)) {
      if (rule === "bare-1000" && YEAR.test(m[0])) continue;
      out.push([rule, m[0]]);
    }
  }
  return out;
}
