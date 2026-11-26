import { parseIsoDate } from "@payroll/engine";
import { sortFindings, type Finding } from "./findings";
import { defaultLayout, type SifLayout } from "./layout";
import { parseSif, SIF_FIELD_COUNT, type ParsedRecord } from "./parse";
import { checkEdr, type EdrInfo } from "./validate-edr";
import {
  checkEvp,
  checkScr,
  monthOf,
  type ScrInfo,
} from "./validate-records";
import { report, stripZeros, type Ctx } from "./validate-fields";

interface Walk {
  readonly edrs: EdrInfo[];
  /** EDR lines by type, even those with a bad field count. */
  readonly edrCount: number;
  /** False when some EDR could not be read, so the total is unknown. */
  readonly complete: boolean;
}

function walk(ctx: Ctx, records: readonly ParsedRecord[]): Walk {
  const edrs: EdrInfo[] = [];
  let prev: EdrInfo | null = null;
  let edrCount = 0;
  let complete = true;
  for (const r of records) {
    if (r.type === "EDR") edrCount += 1;
    if (r.fields.length !== SIF_FIELD_COUNT) {
      complete = complete && r.type !== "EDR";
      prev = null;
    } else if (r.type === "EDR") {
      prev = checkEdr(ctx, r);
      edrs.push(prev);
    } else if (r.type === "EVP") {
      checkEvp(ctx, r, prev);
    } else {
      prev = null;
    }
  }
  return { edrs, edrCount, complete };
}

function lastScr(ctx: Ctx, records: readonly ParsedRecord[]): ScrInfo | null {
  const r = records[records.length - 1];
  if (r === undefined || r.type !== "SCR") return null;
  if (r.fields.length !== SIF_FIELD_COUNT) return null;
  return checkScr(ctx, r);
}

function checkEmployees(ctx: Ctx, edrs: readonly EdrInfo[]): void {
  const seen = new Set<string>();
  for (const e of edrs) {
    const v = e.variable;
    if (v !== null && v > 0n && !e.hasEvp) {
      report(ctx, "EVP_MISSING", "warning", e.rec, 9,
        "Variable pay is above zero but no EVP follows");
    }
    if (e.id === null) continue;
    const key = stripZeros(e.id);
    if (seen.has(key)) {
      report(ctx, "DUPLICATE_EMPLOYEE", "error", e.rec, 2,
        "Second EDR for the same employee");
    }
    seen.add(key);
  }
}

function checkMonths(
  ctx: Ctx,
  edrs: readonly EdrInfo[],
  month: string,
): void {
  for (const e of edrs) {
    const field = e.start !== null && monthOf(e.start) !== month ? 5
      : e.end !== null && monthOf(e.end) !== month ? 6 : null;
    if (field !== null) {
      report(ctx, "MONTH_MISMATCH", "error", e.rec, field,
        `Pay date is outside the SCR salary month ${month}`);
    }
  }
}

/**
 * `unknown`: some line had an unknown record type and may be a hidden
 * EDR, so a count or total larger than what we read is not an error yet.
 * Smaller is still certain.
 */
function checkTotals(
  ctx: Ctx,
  w: Walk,
  scr: ScrInfo,
  unknown: boolean,
): void {
  if (scr.count !== null && scr.count !== w.edrCount &&
    !(unknown && scr.count > w.edrCount)) {
    report(ctx, "EDR_COUNT_MISMATCH", "error", scr.rec, 7,
      `SCR count differs from the ${w.edrCount} EDR lines`);
  }
  let sum = 0n;
  for (const e of w.edrs) {
    if (e.fixed === null || e.variable === null) return;
    sum += e.fixed + e.variable;
  }
  if (w.complete && scr.total !== null && scr.total !== sum &&
    !(unknown && scr.total > sum)) {
    report(ctx, "TOTAL_MISMATCH", "error", scr.rec, 8,
      "SCR total differs from the sum of fixed and variable pay");
  }
}

/**
 * Check a SIF file against the layout. Never throws on bad file text;
 * `today` (ISO date, an input, never the clock) enables the
 * FUTURE_CREATION_DATE check and must itself be a valid date.
 */
export function validateSif(
  text: string,
  layout: SifLayout = defaultLayout,
  today?: string,
): Finding[] {
  if (today !== undefined) parseIsoDate(today, "today");
  const parsed = parseSif(text);
  const ctx: Ctx = { layout, out: [...parsed.findings], today,
    unknownRouting: new Set() };
  const w = walk(ctx, parsed.records);
  checkEmployees(ctx, w.edrs);
  const scr = lastScr(ctx, parsed.records);
  if (scr !== null) {
    if (scr.month !== null) checkMonths(ctx, w.edrs, scr.month);
    const unknown = parsed.findings.some((f) => f.code === "RECORD_TYPE");
    checkTotals(ctx, w, scr, unknown);
  }
  return sortFindings(ctx.out);
}
