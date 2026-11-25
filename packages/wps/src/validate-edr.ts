import { daysBetween, type Fils } from "@payroll/engine";
import { ibanChecksumOk } from "./iban";
import { fieldAt, type ParsedRecord } from "./parse";
import {
  checkAmount,
  checkCount,
  checkDate,
  checkId,
  checkRouting,
  report,
  type Ctx,
} from "./validate-fields";

/** What later checks need from one EDR; null means the field is bad. */
export interface EdrInfo {
  readonly rec: ParsedRecord;
  readonly id: string | null;
  readonly routing: string | null;
  readonly start: string | null;
  readonly end: string | null;
  readonly fixed: Fils | null;
  readonly variable: Fils | null;
  hasEvp: boolean;
}

function checkAccount(
  ctx: Ctx,
  r: ParsedRecord,
  routing: string | null,
): void {
  const v = fieldAt(r, 4);
  const len = ctx.layout.accountLength;
  if (v.length !== len) {
    report(ctx, "ACCOUNT_LENGTH", "error", r, 4,
      `Account must be ${len} characters (IBAN)`);
    return;
  }
  if (!/^[A-Z]{2}[0-9]{2}/.test(v)) return;
  if (!ibanChecksumOk(v)) {
    report(ctx, "IBAN_CHECKSUM", "warning", r, 4,
      "IBAN check digits do not pass mod 97");
  }
  if (routing !== null && v.slice(4, 7) !== routing.slice(1, 4)) {
    report(ctx, "ROUTING_IBAN_BANK_MISMATCH", "warning", r, 4,
      "IBAN bank digits 5-7 differ from routing code digits 2-4");
  }
}

function checkPeriod(
  ctx: Ctx,
  r: ParsedRecord,
): { start: string | null; end: string | null } {
  const start = checkDate(ctx, r, 5);
  const end = checkDate(ctx, r, 6);
  if (start !== null && start < ctx.layout.minPayStart) {
    report(ctx, "PAY_START_TOO_EARLY", "error", r, 5,
      `Pay start cannot be before ${ctx.layout.minPayStart}`);
  }
  const days = checkCount(ctx, r, 7);
  if (start !== null && end !== null && days !== null &&
    daysBetween(start, end) + 1 !== days) {
    report(ctx, "DAYS_MISMATCH", "error", r, 7,
      "Days must be pay end minus pay start plus 1");
  }
  return { start, end };
}

function checkPay(
  ctx: Ctx,
  r: ParsedRecord,
): { fixed: Fils | null; variable: Fils | null } {
  const fixed = checkAmount(ctx, r, 8);
  const variable = checkAmount(ctx, r, 9);
  if (fixed !== null && variable !== null && fixed + variable === 0n) {
    report(ctx, "ZERO_PAY", "warning", r, 8,
      "Employee is paid nothing this period");
  }
  checkCount(ctx, r, 10);
  return { fixed, variable };
}

export function checkEdr(ctx: Ctx, r: ParsedRecord): EdrInfo {
  const id = checkId(ctx, r, 2, ctx.layout.personIdLength);
  const routing = checkRouting(ctx, r, 3);
  checkAccount(ctx, r, routing);
  const period = checkPeriod(ctx, r);
  const pay = checkPay(ctx, r);
  return { rec: r, id, routing, ...period, ...pay, hasEvp: false };
}
