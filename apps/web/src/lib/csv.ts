import type { Fils } from "@payroll/engine";

/**
 * A cell: text (guarded), a whole number, or an amount in fils (with
 * `signed`, a change: "+" on a rise on screen; the CSV stays a plain
 * number).
 */
export type Cell = string | number | { fils: Fils; signed?: boolean };

/** "933730.94" from fils: a plain number a spreadsheet can add up. */
export function filsDecimal(f: Fils): string {
  const neg = f < 0n;
  const a = neg ? -f : f;
  const frac = String(a % 100n).padStart(2, "0");
  return `${neg ? "-" : ""}${a / 100n}.${frac}`;
}

/**
 * Text that a spreadsheet would read as a formula (= + - @, and tab or
 * carriage return in front) gets an apostrophe in front, so it stays
 * text. Our own numbers and amounts are written as plain numbers.
 */
export function guard(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function quote(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function cellText(c: Cell): string {
  if (typeof c === "number") return String(c);
  // The screen's minus (U+2212) is a plain hyphen in the file.
  if (typeof c === "string") return quote(guard(c.replace(/\u2212/g, "-")));
  return filsDecimal(c.fils);
}

/** RFC 4180 lines (CRLF), with a byte order mark so Excel reads UTF-8. */
export function toCsv(rows: readonly (readonly Cell[])[]): string {
  const lines = rows.map((r) => r.map(cellText).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}

/** U+FEFF, written as an escape so the source stays plain. */
const BOM = String.fromCharCode(0xfeff);
