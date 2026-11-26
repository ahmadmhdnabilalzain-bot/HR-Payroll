import type { Finding } from "./findings";

const CLOSING =
  "Layout matches two bank guides. Not confirmed by MOHRE or a bank test.";

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

function where(f: Finding): string {
  const field = f.field === null ? "" : `, field ${f.field}`;
  return `line ${f.line}${field}`;
}

const MAX_VALUE = 40;

/**
 * File text is untrusted: show it quoted, control and non-ASCII
 * characters as "?", at most 40 characters. Echoed file text is the one
 * part of the report that is not our own wording.
 */
function quote(v: string): string {
  const clean = v.replace(/[^\x20-\x7e]/g, "?");
  const cut = clean.length > MAX_VALUE
    ? `${clean.slice(0, MAX_VALUE)}...` : clean;
  return `"${cut.replace(/"/g, "'")}"`;
}

function describe(f: Finding): string {
  const value = f.value === "" ? "" : ` (value: ${quote(f.value)})`;
  return `  ${where(f)}: ${f.severity} ${f.code}: ${f.message}${value}`;
}

/** Plain-English summary of findings for one file. Pure text, no I/O. */
export function renderReport(
  findings: readonly Finding[],
  fileName: string,
): string {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;
  const head = errors === 0 ? "No errors" : plural(errors, "error");
  const lines = [
    `${head}, ${plural(warnings, "warning")} in ${fileName}.`,
    "",
  ];
  for (const f of findings) lines.push(describe(f));
  if (findings.length > 0) lines.push("");
  lines.push(CLOSING, "");
  return lines.join("\n");
}
