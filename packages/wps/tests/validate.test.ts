import { describe, expect, it } from "vitest";
import type { Finding } from "../src/findings";
import { defaultLayout as L } from "../src/layout";
import { validateSif } from "../src/validate";
import {
  BASE,
  DIB_SAMPLE,
  EI_SAMPLE,
  setField as set,
  text,
} from "./fixtures";

const errors = (fs: Finding[]): Finding[] =>
  fs.filter((f) => f.severity === "error");

describe("validateSif samples", () => {
  it("finds nothing at all in the clean fixture", () => {
    expect(validateSif(text(BASE))).toEqual([]);
  });
  it("finds no errors in the DIB sample", () => {
    expect(errors(validateSif(DIB_SAMPLE, L))).toEqual([]);
  });
  it("parses the Emirates Islamic sample with id errors", () => {
    const fs = validateSif(EI_SAMPLE, L);
    const ids = fs.filter((f) => f.code === "ID_FORMAT");
    expect(ids.map((f) => [f.line, f.field])).toEqual([[1, 2], [2, 2]]);
    expect(errors(fs).every((f) => f.code === "ID_FORMAT")).toBe(true);
    const spaces = fs.filter((f) => f.code === "FIELD_HAS_SPACES");
    expect(spaces.length).toBe(27);
    expect(spaces.every((f) => f.severity === "warning")).toBe(true);
  });
});

type Case = readonly [
  code: string,
  severity: "error" | "warning",
  lines: readonly string[],
  line: number,
  field: number | null,
  today?: string,
];

const EVP_663 = "EVP,00915012345663,802420101,0.00,0.00,0.00,0.00,0.00," +
  "0.00,0.00";
const [l1, l2, l3, l4] = BASE as [string, string, string, string];

const CASES: readonly Case[] = [
  ["NO_SCR", "error", [l1, l2, l3], 3, null],
  ["SCR_NOT_LAST", "error", [l4, l1, l2, l3], 1, null],
  ["RECORD_TYPE", "error", set(3, 1, "EDX"), 3, 1],
  ["FIELD_COUNT", "error", [l1, l2, l3 + ",9", l4], 3, null],
  ["ID_FORMAT", "error", set(3, 2, "0091501234566X"), 3, 2],
  ["ID_FORMAT", "error", set(4, 2, "123456"), 4, 2],
  ["ROUTING_FORMAT", "error", set(3, 3, "80242010"), 3, 3],
  ["ACCOUNT_LENGTH", "error", set(3, 4, "AE13024"), 3, 4],
  ["IBAN_CHECKSUM", "warning", set(3, 4, "AE140240043520123456702"), 3, 4],
  ["IBAN_CHECKSUM", "warning", set(3, 4, "12345678901234567890123"), 3, 4],
  ["ROUTING_IBAN_BANK_MISMATCH", "warning",
    set(3, 4, "AE590340000000000000001"), 3, 4],
  ["DATE_FORMAT", "error", set(3, 5, "2016-01-32"), 3, 5],
  ["DATE_FORMAT", "error", set(4, 4, "26-01-2016"), 4, 4],
  ["DATE_FORMAT", "error", set(4, 5, "1160"), 4, 5],
  ["DATE_FORMAT", "error", set(4, 6, "01-2016"), 4, 6],
  ["ROUTING_UNKNOWN", "warning", set(3, 3, "123456789"), 3, 3],
  ["FIELD_TOO_LONG", "error", set(4, 10, "x".repeat(36)), 4, 10],
  ["PAY_START_TOO_EARLY", "error",
    set(4, 6, "092010", set(3, 5, "2010-09-01",
      set(3, 6, "2010-09-30", set(3, 7, "30")))).slice(2), 1, 5],
  ["DAYS_MISMATCH", "error", set(3, 7, "30"), 3, 7],
  ["DAYS_MISMATCH", "error", set(3, 6, "2016-01-01"), 3, 7],
  ["PAY_END_BEFORE_START", "error",
    set(3, 5, "2016-01-02", set(3, 6, "2016-01-01",
      set(3, 7, "0", set(3, 10, "99")))), 3, 6],
  ["NEGATIVE_AMOUNT", "error", set(3, 8, "-3000.00"), 3, 8],
  ["NEGATIVE_AMOUNT", "error", set(2, 4, "-500.00"), 2, 4],
  ["AMOUNT_FORMAT", "error", set(3, 8, "3000.5"), 3, 8],
  ["AMOUNT_FORMAT", "error", set(4, 8, "9500"), 4, 8],
  ["COUNT_FORMAT", "error", set(3, 10, "x"), 3, 10],
  ["DUPLICATE_EMPLOYEE", "error", set(3, 2, "00915012345663"), 3, 2],
  ["MONTH_MISMATCH", "error", set(3, 6, "2016-02-01", set(3, 7, "32")),
    3, 6],
  ["EDR_COUNT_MISMATCH", "error", set(4, 7, "3"), 4, 7],
  ["TOTAL_MISMATCH", "error", set(4, 8, "9500.01"), 4, 8],
  ["CURRENCY", "error", set(4, 9, "USD"), 4, 9],
  ["EVP_WITHOUT_EDR", "error", [l1, l2, l3, EVP_663, l4], 4, 2],
  ["EVP_WITHOUT_EDR", "error", [l2, l1, l3, l4], 1, null],
  ["EVP_WITHOUT_EDR", "error", set(2, 3, "703420114"), 2, 3],
  ["EVP_MISSING", "warning",
    set(4, 8, "9600.00", set(3, 9, "100.00")), 3, 9],
  ["EVP_SUM_MISMATCH", "warning", set(2, 4, "501.00"), 2, null],
  ["FUTURE_CREATION_DATE", "error", BASE, 4, 4, "2016-01-25"],
  ["NON_ASCII", "error", set(4, 10, "abc شركة"), 4, 10],
  ["ZERO_PAY", "warning", set(4, 8, "6500.00", set(3, 8, "0.00")), 3, 8],
  ["FIELD_HAS_SPACES", "warning", set(3, 2, " 00915012345664 "), 3, 2],
];

describe("validateSif finding codes", () => {
  for (const [code, severity, lines, line, field, today] of CASES) {
    it(`${code} at line ${line} field ${String(field)}`, () => {
      const fs = validateSif(text(lines), L, today);
      expect(fs).toContainEqual(
        expect.objectContaining({ code, severity, line, field }),
      );
    });
  }
  it("covers every code in the brief", () => {
    const listed = [
      "NO_SCR", "SCR_NOT_LAST", "RECORD_TYPE", "FIELD_COUNT", "ID_FORMAT",
      "ROUTING_FORMAT", "ACCOUNT_LENGTH", "IBAN_CHECKSUM",
      "ROUTING_IBAN_BANK_MISMATCH", "DATE_FORMAT", "DAYS_MISMATCH",
      "NEGATIVE_AMOUNT", "DUPLICATE_EMPLOYEE", "MONTH_MISMATCH",
      "EDR_COUNT_MISMATCH", "TOTAL_MISMATCH", "EVP_WITHOUT_EDR",
      "EVP_MISSING", "EVP_SUM_MISMATCH", "FUTURE_CREATION_DATE",
      "NON_ASCII", "ZERO_PAY", "FIELD_HAS_SPACES", "FIELD_TOO_LONG",
      "ROUTING_UNKNOWN", "PAY_END_BEFORE_START",
    ];
    const tested = new Set(CASES.map((c) => c[0]));
    expect(listed.filter((c) => !tested.has(c))).toEqual([]);
  });
});

describe("validateSif details", () => {
  it("counts physical lines with CRLF and blank lines", () => {
    const lines = set(3, 7, "30");
    const t = [lines[0], lines[1], "", lines[2], lines[3]].join("\r\n");
    expect(validateSif(t, L)).toEqual([
      expect.objectContaining({ code: "DAYS_MISMATCH", line: 4, field: 7 }),
    ]);
  });
  it("a reversed period gives one finding, even with days 0", () => {
    const lines = set(3, 5, "2016-01-02", set(3, 6, "2016-01-01",
      set(3, 7, "0", set(3, 10, "99"))));
    expect(validateSif(text(lines), L).map((f) => f.code)).toEqual(
      ["PAY_END_BEFORE_START"]);
  });
  it("accepts a creation date equal to today", () => {
    expect(validateSif(text(BASE), L, "2016-01-26")).toEqual([]);
  });
  it("reports one root cause, not derived findings", () => {
    const fs = validateSif(text(set(3, 5, "2016-13-01")), L);
    expect(fs.map((f) => f.code)).toEqual(["DATE_FORMAT"]);
    const amt = validateSif(text(set(3, 8, "abc")), L);
    expect(amt.map((f) => f.code)).toEqual(["AMOUNT_FORMAT"]);
  });
  it("accepts a 35 character employer reference", () => {
    const fs = validateSif(text(set(4, 10, "x".repeat(35))), L);
    expect(fs).toEqual([]);
  });
  it("does not add count or total errors for an unknown record type", () => {
    const fs = validateSif(text(set(3, 1, "EDX")), L);
    expect(fs.map((f) => f.code)).toEqual(["RECORD_TYPE"]);
  });
  it("still reports a count and total smaller than the known records", () => {
    const [a, b, c, d] = BASE as [string, string, string, string];
    const scr = set(4, 7, "1", set(4, 8, "1.00"))[3]!;
    const fs = validateSif(text([a, b, "junk,1", c, scr]), L);
    expect(fs.map((f) => f.code)).toEqual([
      "RECORD_TYPE", "EDR_COUNT_MISMATCH", "TOTAL_MISMATCH",
    ]);
    void d;
  });
  it("skips count and total when the SCR is larger than known", () => {
    const [a, b, c, d] = BASE as [string, string, string, string];
    const scr = set(4, 7, "3", set(4, 8, "99999.00"))[3]!;
    const fs = validateSif(text([a, b, "junk,1", c, scr]), L);
    expect(fs.map((f) => f.code)).toEqual(["RECORD_TYPE"]);
    void d;
  });
  it("still checks count and total when all record types are known", () => {
    const fs = validateSif(text(set(4, 7, "5", set(4, 8, "1.00"))), L);
    expect(fs.map((f) => f.code)).toEqual([
      "EDR_COUNT_MISMATCH", "TOTAL_MISMATCH",
    ]);
  });
  it("does not report NO_SCR when the SCR has a bad field count", () => {
    const fs = validateSif(text(set(4, 10, "a,b")), L);
    expect(fs.map((f) => f.code)).toEqual(["FIELD_COUNT"]);
  });
  it("sorts findings by line then field", () => {
    const lines = set(4, 7, "9", set(3, 8, "-1.00", set(1, 3, "1")));
    const fs = validateSif(text(lines), L);
    const keys = fs.map((f) => [f.line, f.field ?? 0]);
    const sorted = [...keys].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
    expect(keys).toEqual(sorted);
  });
  it("finds NO_SCR in an empty file at line 1", () => {
    expect(validateSif("", L)).toEqual([
      expect.objectContaining({ code: "NO_SCR", line: 1, field: null }),
    ]);
  });
});
