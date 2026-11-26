import { describe, expect, it } from "vitest";
import { makeFinding } from "../src/findings";
import { defaultLayout as L } from "../src/layout";
import { renderReport } from "../src/report";
import { validateSif } from "../src/validate";
import { BASE, setField as set, text } from "./fixtures";

const CLOSING =
  "Layout matches two bank guides. Not confirmed by MOHRE or a bank test.";
const BANNED = /compliant|approved|certified/i;

describe("renderReport", () => {
  it("starts with No errors for a clean file", () => {
    const out = renderReport(validateSif(text(BASE), L), "a.SIF");
    expect(out.startsWith("No errors")).toBe(true);
    expect(out).toContain("a.SIF");
    expect(out.trimEnd().endsWith(CLOSING)).toBe(true);
    expect(out).not.toMatch(BANNED);
  });
  it("counts errors and warnings and lists each with line and field", () => {
    const fs = validateSif(text(set(3, 8, "-1.00", set(1, 3, "1"))), L);
    const out = renderReport(fs, "b.SIF");
    const errs = fs.filter((f) => f.severity === "error").length;
    const warns = fs.length - errs;
    expect(out.startsWith(`${errs} error`)).toBe(true);
    expect(out).toContain(`${warns} warning`);
    expect(out).toMatch(/line 3, field 8/);
    expect(out).toContain("NEGATIVE_AMOUNT");
    expect(out.trimEnd().endsWith(CLOSING)).toBe(true);
    expect(out).not.toMatch(BANNED);
  });
  it("uses singular wording for one error", () => {
    const f = makeFinding("X", "error", { line: 2, field: null }, "bad", "v");
    const out = renderReport([f], "c.SIF");
    expect(out).toContain("1 error,");
    expect(out).toMatch(/line 2: /);
    expect(out).not.toMatch(/field null/);
  });
  it("says warnings only when there are no errors", () => {
    const f = makeFinding("W", "warning", { line: 1, field: 3 }, "hm", "v");
    const out = renderReport([f], "d.SIF");
    expect(out.startsWith("No errors, 1 warning")).toBe(true);
  });
  it("sanitises echoed values and never leaks banned words", () => {
    const at = { line: 1, field: 2 };
    const fs = [
      makeFinding("A", "error", at, "bad", "approved"),
      makeFinding("B", "error", at, "bad", "x\rcompliant\n\0\t"),
      makeFinding("C", "error", at, "bad", "y".repeat(500)),
    ];
    const out = renderReport(fs, "f.SIF");
    const lines = out.split("\n");
    expect(out).not.toMatch(/[\r\0\t]/);
    expect(lines.some((l) => l.includes('(value: "x?compliant???")')))
      .toBe(true);
    expect(lines.some((l) => l.includes(`"${"y".repeat(40)}..."`))).toBe(true);
    expect(lines.every((l) => l.length < 200)).toBe(true);
    // Own wording stays clean once quoted values are removed.
    const own = out.replace(/\(value: ".*"\)/g, "");
    expect(own).not.toMatch(BANNED);
    expect(own.trimEnd().endsWith(CLOSING)).toBe(true);
  });
  it("never says compliant, approved or certified", () => {
    const files = [BASE, set(1, 3, "1"), set(3, 5, "x"), []];
    for (const f of files) {
      expect(renderReport(validateSif(text(f), L), "e.SIF")).not.toMatch(
        BANNED,
      );
    }
  });
});
