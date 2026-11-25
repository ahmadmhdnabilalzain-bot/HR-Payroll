import { fils, isValidIsoDate, type Fils } from "@payroll/engine";
import { makeFinding, type Finding } from "./findings";
import type { SifLayout } from "./layout";
import { fieldAt, type ParsedRecord } from "./parse";

/** Shared state for one validation run. */
export interface Ctx {
  readonly layout: SifLayout;
  readonly out: Finding[];
  readonly today: string | undefined;
}

type Severity = Finding["severity"];

export function report(
  ctx: Ctx,
  code: string,
  severity: Severity,
  r: ParsedRecord,
  field: number | null,
  message: string,
): void {
  const value = field === null ? r.type : fieldAt(r, field);
  ctx.out.push(makeFinding(code, severity, { line: r.line, field },
    message, value));
}

/** Leading zeros do not make a different person or employer. */
export const stripZeros = (id: string): string => id.replace(/^0+/, "");

export function checkId(
  ctx: Ctx,
  r: ParsedRecord,
  n: number,
  len: number,
): string | null {
  const v = fieldAt(r, n);
  if (/^[0-9]+$/.test(v) && v.length === len) return v;
  report(ctx, "ID_FORMAT", "error", r, n,
    `Id must be ${len} digits, zero-padded`);
  return null;
}

export function checkRouting(
  ctx: Ctx,
  r: ParsedRecord,
  n: number,
): string | null {
  const v = fieldAt(r, n);
  const len = ctx.layout.routingLength;
  if (/^[0-9]+$/.test(v) && v.length === len) return v;
  report(ctx, "ROUTING_FORMAT", "error", r, n,
    `Routing code must be ${len} digits`);
  return null;
}

export function checkDate(
  ctx: Ctx,
  r: ParsedRecord,
  n: number,
): string | null {
  const v = fieldAt(r, n);
  if (isValidIsoDate(v)) return v;
  report(ctx, "DATE_FORMAT", "error", r, n,
    "Date must be a real date in the form YYYY-MM-DD");
  return null;
}

/** Plain decimal with exactly two places, never negative. */
export function checkAmount(
  ctx: Ctx,
  r: ParsedRecord,
  n: number,
): Fils | null {
  const v = fieldAt(r, n);
  const m = /^([0-9]+)\.([0-9]{2})$/.exec(v);
  if (m !== null) return fils(BigInt(`${m[1]}${m[2]}`));
  if (/^-[0-9]+(\.[0-9]+)?$/.test(v)) {
    report(ctx, "NEGATIVE_AMOUNT", "error", r, n,
      "Amount cannot be negative");
  } else {
    report(ctx, "AMOUNT_FORMAT", "error", r, n,
      "Amount must be digits with two decimals, e.g. 4000.00");
  }
  return null;
}

/** Whole number of digits only. */
export function checkCount(
  ctx: Ctx,
  r: ParsedRecord,
  n: number,
): number | null {
  const v = fieldAt(r, n);
  if (/^[0-9]{1,9}$/.test(v)) return Number(v);
  report(ctx, "COUNT_FORMAT", "error", r, n,
    "Count must be a whole number of digits");
  return null;
}

/** Sum of fields from..to, or null if any of them is not an amount. */
export function checkAmounts(
  ctx: Ctx,
  r: ParsedRecord,
  from: number,
  to: number,
): Fils | null {
  let sum = 0n;
  let ok = true;
  for (let n = from; n <= to; n++) {
    const a = checkAmount(ctx, r, n);
    if (a === null) ok = false;
    else sum += a;
  }
  return ok ? fils(sum) : null;
}
