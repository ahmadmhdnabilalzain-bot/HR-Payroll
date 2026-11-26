import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { cellText, filsDecimal, guard, toCsv } from "../../src/reports/csv";

describe("csv safety", () => {
  it("guards-formula-starts", () => {
    for (const x of ["=1+1", "+1", "-2", "@SUM(A1)", "\tx", "\rx"]) {
      expect(guard(x).startsWith("'")).toBe(true);
    }
    expect(guard("Priya Nair")).toBe("Priya Nair");
    expect(guard("a=b")).toBe("a=b");
  });

  it("quotes-commas-quotes-and-newlines", () => {
    expect(cellText("Al Ain, branch")).toBe('"Al Ain, branch"');
    expect(cellText('say "hi"')).toBe('"say ""hi"""');
    expect(cellText("two\nlines")).toBe('"two\nlines"');
    expect(cellText('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });

  it("amounts-are-plain-numbers-in-whole-fils", () => {
    expect(filsDecimal(fils(93373094n))).toBe("933730.94");
    expect(filsDecimal(fils(-118064n))).toBe("-1180.64");
    expect(filsDecimal(fils(5n))).toBe("0.05");
    expect(cellText({ fils: fils(-118064n) })).toBe("-1180.64");
    expect(cellText(31)).toBe("31");
  });

  it("whole-file-has-bom-and-crlf", () => {
    const t = toCsv([["Name", "Net"], ["=cmd", { fils: fils(100n) }]]);
    expect(t.startsWith("\uFEFFName,Net\r\n")).toBe(true);
    expect(t).toContain("'=cmd,1.00\r\n");
  });
});
