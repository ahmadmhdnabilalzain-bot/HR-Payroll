import { makeFinding, sortFindings, type Finding } from "./findings";

export type RecordType = "EDR" | "EVP" | "SCR";

/**
 * One non-empty line of a SIF file with a known record type. fields[0]
 * is the record type; field n of the layout is fields[n - 1]. Fields are
 * trimmed of spaces. The field count may be wrong (FIELD_COUNT is then
 * reported), so read fields through fieldAt.
 */
export interface ParsedRecord {
  readonly line: number;
  readonly type: RecordType;
  readonly fields: readonly string[];
}

export interface ParseResult {
  readonly records: ParsedRecord[];
  readonly findings: Finding[];
}

export const SIF_FIELD_COUNT = 10;
const TYPES: readonly string[] = ["EDR", "EVP", "SCR"];

interface Row {
  readonly line: number;
  readonly fields: string[];
}

/** Field n (1-based), or "" when the record is too short. */
export function fieldAt(r: ParsedRecord, n: number): string {
  return r.fields[n - 1] ?? "";
}

function trimFields(line: number, raw: string, out: Finding[]): string[] {
  return raw.split(",").map((v, i) => {
    const t = v.replace(/^ +/, "").replace(/ +$/, "");
    if (t !== v) {
      out.push(makeFinding("FIELD_HAS_SPACES", "warning",
        { line, field: i + 1 }, "Field has spaces around it; trimmed", v));
    }
    return t;
  });
}

function checkAscii(row: Row, out: Finding[]): void {
  row.fields.forEach((v, i) => {
    if (/[^\x20-\x7e]/.test(v)) {
      out.push(makeFinding("NON_ASCII", "error",
        { line: row.line, field: i + 1 },
        "Field has a character outside printable ASCII", v));
    }
  });
}

function toRows(text: string, out: Finding[]): Row[] {
  const rows: Row[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (/^ *$/.test(raw)) return;
    const row = { line: i + 1, fields: trimFields(i + 1, raw, out) };
    checkAscii(row, out);
    rows.push(row);
  });
  return rows;
}

function toRecord(row: Row, out: Finding[]): ParsedRecord | null {
  const type = row.fields[0] ?? "";
  const at = { line: row.line, field: null };
  if (!TYPES.includes(type)) {
    out.push(makeFinding("RECORD_TYPE", "error", { ...at, field: 1 },
      "Record type must be EDR, EVP or SCR", type));
    return null;
  }
  if (row.fields.length !== SIF_FIELD_COUNT) {
    out.push(makeFinding("FIELD_COUNT", "error", at,
      `Record must have ${SIF_FIELD_COUNT} fields`,
      String(row.fields.length)));
  }
  return { line: row.line, type: type as RecordType, fields: row.fields };
}

function checkScrPlace(rows: Row[], out: Finding[]): void {
  const last = rows[rows.length - 1];
  const scrs = rows.filter((r) => r.fields[0] === "SCR");
  if (scrs.length === 0) {
    out.push(makeFinding("NO_SCR", "error",
      { line: last?.line ?? 1, field: null },
      "File has no SCR control record", ""));
  }
  for (const r of scrs) {
    if (r !== last) {
      out.push(makeFinding("SCR_NOT_LAST", "error",
        { line: r.line, field: null },
        "SCR must be the last line of the file", "SCR"));
    }
  }
}

/** Split a SIF file into records. Never throws; problems are findings. */
export function parseSif(text: string): ParseResult {
  const findings: Finding[] = [];
  const rows = toRows(text, findings);
  const records: ParsedRecord[] = [];
  for (const row of rows) {
    const rec = toRecord(row, findings);
    if (rec !== null) records.push(rec);
  }
  checkScrPlace(rows, findings);
  return { records, findings: sortFindings(findings) };
}
