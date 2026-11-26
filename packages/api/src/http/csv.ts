/**
 * Pure CSV writer (RFC 4180, CRLF, UTF-8 with a BOM so Excel reads
 * Arabic). A cell that starts with tab or CR, or whose first non-space
 * character is `=`, `+`, `-`, `@` or their full-width forms, gets a
 * leading `'`, so a spreadsheet shows it as text, never a formula. A
 * cell with `;` is quoted too, for locales whose list separator is a
 * semicolon.
 */
const FORMULA = /^(?:[\t\r]| *[=+\-@\uff1d\uff0b\uff0d\uff20])/;
const NEEDS_QUOTES = /[",;\r\n]/;
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
