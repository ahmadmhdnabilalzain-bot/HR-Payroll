/**
 * Pure CSV writer (RFC 4180, CRLF, UTF-8 with a BOM so Excel reads
 * Arabic). A cell that starts with `=`, `+`, `-`, `@`, tab or CR gets
 * a leading `'`, so a spreadsheet shows it as text, never a formula.
 */
const FORMULA = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;
const BOM = "﻿";

function cell(value: string): string {
  const safe = FORMULA.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const row = (cells: string[]) => `${cells.map(cell).join(",")}\r\n`;

/** `statement`, when given, is the first line as one quoted cell. */
export function toCsv(statement: string | null, header: string[],
  rows: string[][]): string {
  const first = statement === null ? ""
    : `"${statement.replace(/"/g, '""')}"\r\n`;
  return BOM + first + row(header) + rows.map(row).join("");
}
