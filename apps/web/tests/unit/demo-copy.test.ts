import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { en } from "../../src/i18n/en";
import { flatten } from "../../src/i18n/t";

/**
 * Words the demo must never show (bank audience, no claims): the
 * English catalog and every data text the screens display.
 */
const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;

const texts = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Object.values(v as Record<string, string>);

describe("demo copy", () => {
  it("catalog-has-no-claims", () => {
    const hits = Object.entries(flatten(en)).filter(([k]) =>
      !k.startsWith("errors.")).filter(([, v]) =>
      texts(v).some((x) => BANNED.test(x))).map(([k]) => k);
    expect(hits).toEqual([]);
  });

  it("displayed-data-has-no-claims", () => {
    const d = buildDemoData();
    const shown = [
      ...d.issues().flatMap((i) => [i.title.en, i.reason.en,
        i.suggestedFix.en]),
      ...d.approvalsInbox().map((a) => a.title.en),
      ...d.documents().map((x) => x.kind.en),
      d.basis().ruleSet.en, d.basis().pension.en, d.companyName.en,
    ];
    expect(shown.filter((x) => BANNED.test(x))).toEqual([]);
  });
});
