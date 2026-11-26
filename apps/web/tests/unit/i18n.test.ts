import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../src/api/contract";
import { ar } from "../../src/i18n/ar";
import { en } from "../../src/i18n/en";
import { createT, errorText, flatten } from "../../src/i18n/t";
import { filesUnder, readWeb } from "../helpers/files";

const EN = flatten(en);
const AR = flatten(ar);

const placeholders = (s: string): string[] =>
  [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? ""))].sort();

const allText = (v: unknown): string[] =>
  typeof v === "string" ? [v]
    : Object.values(v as Record<string, string>);

describe("i18n catalogs", () => {
  it("ar-has-every-en-key", () => {
    expect(Object.keys(AR).sort()).toEqual(Object.keys(EN).sort());
  });

  it("same-placeholders", () => {
    const bad = Object.keys(EN).filter((k) => {
      const e = allText(EN[k]).flatMap(placeholders);
      const a = allText(AR[k]).flatMap(placeholders);
      return [...new Set(e)].sort().join() !== [...new Set(a)].sort().join();
    });
    expect(bad).toEqual([]);
  });

  it("no-empty-strings", () => {
    const empty = [...Object.entries(EN), ...Object.entries(AR)]
      .filter(([, v]) => allText(v).some((s) => s.trim() === ""))
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it("ar-files-flagged", () => {
    const files = filesUnder("src/i18n/ar", [".ts"]);
    expect(files.length).toBeGreaterThan(0);
    const head = "// NEEDS NATIVE REVIEW: authored by Claude, not yet " +
      "confirmed by a\n// native speaker.\n";
    const bad = files.filter((f) => !readWeb(f).startsWith(head));
    expect(bad).toEqual([]);
  });

  it("plurals-en-ar", () => {
    const te = createT("en");
    expect([0, 1, 3].map((count) => te("common.employees", { count })))
      .toEqual(["0 employees", "1 employee", "3 employees"]);
    const ta = createT("ar");
    const forms = ar.common.employees;
    const got = [0, 1, 2, 3, 11, 100]
      .map((count) => ta("common.employees", { count }));
    const want = [forms.zero, forms.one, forms.two, forms.few, forms.many,
      forms.other].map((s, i) =>
      s.replace("{count}", String([0, 1, 2, 3, 11, 100][i])));
    expect(got).toEqual(want);
    expect(new Set(got).size).toBe(6);
  });

  it("missing-vars-stay-visible", () => {
    const te = createT("en");
    expect(te("common.reference", {})).toContain("{requestId}");
  });

  it("every-error-code-has-text", () => {
    const missing = [...ERROR_CODES, "NETWORK", "CONTRACT_MISMATCH"]
      .filter((c) => EN[`errors.${c}`] === undefined);
    expect(missing).toEqual([]);
    const t = createT("en");
    expect(errorText({ code: "INVALID_CREDENTIALS" }, t))
      .toBe("Email, password or code is not correct");
    expect(errorText({ code: "NO_SUCH_CODE" }, t))
      .toBe("Something went wrong. Try again.");
  });
});
