import { parseIsoDate, type Fils } from "@payroll/engine";
import { formatMonth } from "./format";
import type { EdrInfo } from "./validate-edr";
import { fieldAt, type ParsedRecord } from "./parse";
import {
  checkAmount,
  checkAmounts,
  checkCount,
  checkDate,
  checkId,
  checkRouting,
  report,
  stripZeros,
  type Ctx,
} from "./validate-fields";

function pairEvp(ctx: Ctx, r: ParsedRecord, edr: EdrInfo | null): boolean {
  const miss = (field: number | null, why: string): false => {
    report(ctx, "EVP_WITHOUT_EDR", "error", r, field, why);
    return false;
  };
  if (edr === null || edr.hasEvp) {
    return miss(null, "EVP must directly follow its employee's EDR");
  }
  if (stripZeros(fieldAt(r, 2)) !== stripZeros(fieldAt(edr.rec, 2))) {
    return miss(2, "EVP employee id differs from the EDR above it");
  }
  if (fieldAt(r, 3) !== fieldAt(edr.rec, 3)) {
    return miss(3, "EVP routing code differs from the EDR above it");
  }
  return true;
}

/** Check one EVP against the EDR directly above it (or null). */
export function checkEvp(
  ctx: Ctx,
  r: ParsedRecord,
  edr: EdrInfo | null,
): void {
  checkId(ctx, r, 2, ctx.layout.personIdLength);
  checkRouting(ctx, r, 3);
  const sum = checkAmounts(ctx, r, 4, 10);
  if (!pairEvp(ctx, r, edr) || edr === null) return;
  edr.hasEvp = true;
  if (sum !== null && edr.variable !== null && sum !== edr.variable) {
    report(ctx, "EVP_SUM_MISMATCH", "warning", r, null,
      "EVP allowances do not add up to the EDR variable pay " +
        "(inferred from guide samples)");
  }
}

/** What cross checks need from the SCR; null means the field is bad. */
export interface ScrInfo {
  readonly rec: ParsedRecord;
  readonly month: string | null;
  readonly count: number | null;
  readonly total: Fils | null;
}

function checkStamp(ctx: Ctx, r: ParsedRecord): void {
  const date = checkDate(ctx, r, 4);
  if (date !== null && ctx.today !== undefined && date > ctx.today) {
    report(ctx, "FUTURE_CREATION_DATE", "error", r, 4,
      `File creation date is after today (${ctx.today})`);
  }
  if (!/^([01][0-9]|2[0-3])[0-5][0-9]$/.test(fieldAt(r, 5))) {
    report(ctx, "DATE_FORMAT", "error", r, 5,
      "File creation time must be HHMM");
  }
}

function checkMonth(ctx: Ctx, r: ParsedRecord): string | null {
  const v = fieldAt(r, 6);
  if (/^(0[1-9]|1[0-2])[0-9]{4}$/.test(v)) return v;
  report(ctx, "DATE_FORMAT", "error", r, 6, "Salary month must be MMYYYY");
  return null;
}

export function checkScr(ctx: Ctx, r: ParsedRecord): ScrInfo {
  checkId(ctx, r, 2, ctx.layout.employerIdLength);
  checkRouting(ctx, r, 3);
  checkStamp(ctx, r);
  const month = checkMonth(ctx, r);
  const count = checkCount(ctx, r, 7);
  const total = checkAmount(ctx, r, 8);
  if (fieldAt(r, 9) !== ctx.layout.currency) {
    report(ctx, "CURRENCY", "error", r, 9,
      `Currency must be ${ctx.layout.currency}`);
  }
  return { rec: r, month, count, total };
}

/** MMYYYY of an ISO date already known to be valid. */
export function monthOf(iso: string): string {
  const { y, m } = parseIsoDate(iso);
  return formatMonth(y, m);
}
