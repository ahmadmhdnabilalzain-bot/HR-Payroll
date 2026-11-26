import { describe, expect, it } from "vitest";
import { toCsv } from "../src/http/csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("csv_neutralises_formulas (Review Focus 4)", () => {
    const out = toCsv(null, ["a"], [["=1+1"], ["+971"], ["-5"],
      ["@SUM(A1)"], ["\tx"], ["\rx"], ["safe"]]);
    expect(out).toBe(`${BOM}a\r\n'=1+1\r\n'+971\r\n'-5\r\n'@SUM(A1)\r\n` +
      `'\tx\r\n"'\rx"\r\nsafe\r\n`);
  });
  it("csv_quotes", () => {
    const out = toCsv("Statement, with comma", ["x", "y"],
      [["a,b", 'say "hi"'], ["line\nbreak", "plain"]]);
    expect(out.startsWith(`${BOM}"Statement, with comma"\r\n`)).toBe(true);
    expect(out).toContain('"a,b","say ""hi"""\r\n');
    expect(out).toContain('"line\nbreak",plain\r\n');
    expect(out.endsWith("\r\n")).toBe(true);
    expect(toCsv("Plain", ["h"], []).split("\r\n")[0]).toBe(`${BOM}"Plain"`);
  });
  it("csv_arabic", () => {
    const out = toCsv(null, ["name"], [["مطعم"]]);
    expect(out).toBe(`${BOM}name\r\nمطعم\r\n`);
  });
  it("a formula hidden behind a quote-worthy character is still text",
    () => {
      expect(toCsv(null, ["h"], [['=HYPERLINK("http://x","y")']]))
        .toBe(`${BOM}h\r\n"'=HYPERLINK(""http://x"",""y"")"\r\n`);
    });
});
