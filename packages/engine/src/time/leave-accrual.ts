import { daysInMonth, formatIsoDate, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import type { TraceRule } from "../trace-types";
import type { TimeParams } from "./params";
import type {
  BalanceInput,
  BalanceResult,
  CarryOverResult,
  LeaveAccrualPolicy,
  LeavePolicyFacts,
  TimeFlag,
} from "./types";

function badPolicy(field: string, value: number): never {
  throw new EngineError("INVALID_LEAVE_POLICY",
    `${field} must be a whole number of at least 0`,
    { field, value: String(value) });
}

function checkWhole(field: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) badPolicy(field, value);
}

function upfrontHalves(p: LeaveAccrualPolicy, joining: string,
  year: number): number {
  const j = parseIsoDate(joining, "joiningDate");
  if (j.y > year) return 0;
  if (j.y < year || !p.joiningYearProRata) return p.annualDays * 2;
  const months = j.d === 1 ? 13 - j.m : 12 - j.m;
  return Math.floor(p.annualDays * 2 * months / 12);
}

/** Months of `year` fully served and ended by `asOf` (convention). */
function creditedMonths(joining: string, year: number, asOf: string):
  number {
  let credited = 0;
  for (let m = 1; m <= 12; m++) {
    const first = formatIsoDate({ y: year, m, d: 1 });
    const last = formatIsoDate({ y: year, m, d: daysInMonth(year, m) });
    if (joining <= first && last <= asOf) credited++;
  }
  return credited;
}

/**
 * Halves accrued in `year`. Upfront grants the year at once, with an
 * optional joining-year pro-rata by whole months; monthly credits each
 * month fully served and ended by `asOf`.
 */
export function accruedHalves(
  p: LeaveAccrualPolicy,
  joiningDate: string,
  year: number,
  asOf: string,
): number {
  checkWhole("annualDays", p.annualDays);
  checkWhole("year", year);
  parseIsoDate(joiningDate, "joiningDate");
  parseIsoDate(asOf, "asOf");
  if (p.accrual === "upfront") return upfrontHalves(p, joiningDate, year);
  const credited = creditedMonths(joiningDate, year, asOf);
  return Math.floor(p.annualDays * 2 * credited / 12);
}

function halvesError(field: string, value: number): never {
  throw new EngineError("INVALID_HALVES",
    `${field} must be a whole number of halves`,
    { field, value: String(value) });
}

/** Whole halves; at least 0 unless `signed`. */
function checkHalves(field: string, value: number, signed = false): void {
  if (!Number.isSafeInteger(value) || (!signed && value < 0)) {
    halvesError(field, value);
  }
}

function checkBalance(b: BalanceInput): void {
  checkHalves("accruedHalves", b.accruedHalves);
  checkHalves("carriedHalves", b.carriedHalves);
  checkHalves("pendingHalves", b.pendingHalves);
  checkHalves("adjustmentHalves", b.adjustmentHalves, true);
  b.taken.forEach((t) => {
    parseIsoDate(t.date, "taken.date");
    checkHalves("taken.halves", t.halves);
  });
  if (b.carriedExpiresOn !== null) {
    parseIsoDate(b.carriedExpiresOn, "carriedExpiresOn");
  }
  parseIsoDate(b.asOf, "asOf");
}

/** Expiry of carried days has no source in the labour law note. */
export const CARRIED_EXPIRY_NOTE = "Expiry of carried leave is company" +
  " policy, not law: the labour law note has no text for it" +
  " (unsourced); counsel to confirm.";

function expiryFlags(b: BalanceInput, expired: number): TimeFlag[] {
  if (expired <= 0) return [];
  return [{ code: "CARRIED_LEAVE_EXPIRED", dates: [b.asOf], rule: null,
    detail: { expiredHalves: String(expired),
      carriedExpiresOn: String(b.carriedExpiresOn),
      note: CARRIED_EXPIRY_NOTE } }];
}

/**
 * Carried halves are used first (convention); what is unused expires
 * after `carriedExpiresOn` (company policy, flagged as unsourced).
 * Taken entries all count, whatever their date.
 */
export function balanceHalves(b: BalanceInput): BalanceResult {
  checkBalance(b);
  const exp = b.carriedExpiresOn;
  const takenHalves = b.taken.reduce((s, t) => s + t.halves, 0);
  const beforeExpiry = exp === null ? takenHalves : b.taken
    .filter((t) => t.date <= exp).reduce((s, t) => s + t.halves, 0);
  const carriedUsedHalves = Math.min(b.carriedHalves, beforeExpiry);
  const expiredHalves = exp !== null && b.asOf > exp
    ? b.carriedHalves - carriedUsedHalves : 0;
  const availableHalves = b.accruedHalves + b.carriedHalves -
    expiredHalves + b.adjustmentHalves - takenHalves - b.pendingHalves;
  return { takenHalves, carriedUsedHalves, expiredHalves,
    availableHalves, flags: expiryFlags(b, expiredHalves) };
}

/** ER 19(1) offers cash as the alternative; forfeiture is unsourced. */
export const UNUSED_LEAVE_NOTE = "ER 19(1): the alternative to carrying" +
  " forward is its equivalent in cash. Forfeiture of the excess is not" +
  " in the sourced law (unsourced). HR decides on cash or an agreement.";

/**
 * Halves carried into the next year, capped; the excess is returned
 * with an `UNUSED_LEAVE_NOT_CARRIED` warning, never dropped silently.
 */
export function carryOverHalves(remainingHalves: number,
  capHalves: number, p: TimeParams): CarryOverResult {
  checkHalves("remainingHalves", remainingHalves, true);
  checkHalves("capHalves", capHalves);
  const left = Math.max(0, remainingHalves);
  const carriedHalves = Math.min(left, capHalves);
  const excessHalves = left - carriedHalves;
  const flags: TimeFlag[] = excessHalves === 0 ? [] : [{
    code: "UNUSED_LEAVE_NOT_CARRIED", dates: [],
    rule: p.carryOverMaxShareBps.rule,
    detail: { excessHalves: String(excessHalves),
      capHalves: String(capHalves), note: UNUSED_LEAVE_NOTE },
  }];
  return { carriedHalves, excessHalves, flags };
}

function warn(code: string, rule: TraceRule,
  detail: Record<string, string>): TimeFlag {
  return { code, dates: [], detail, rule };
}

function annualWarnings(f: LeavePolicyFacts, days: number,
  p: TimeParams): TimeFlag[] {
  const d = { annualDays: String(days) };
  // The law's days are calendar days: a working-day policy is not
  // compared with either the 30 days or the 2 days a month.
  if (f.dayCount === "working") {
    return [warn("ANNUAL_BASIS_NOT_COMPARED", p.annualLeaveMinDays.rule,
      d)];
  }
  const out: TimeFlag[] = [];
  if (days < p.annualLeaveMinDays.v) {
    out.push(warn("ANNUAL_BELOW_STATUTORY", p.annualLeaveMinDays.rule, d));
  }
  if (f.accrual === "monthly" && days < 12 * p.firstYearDaysPerMonth.v) {
    out.push(warn("MONTHLY_BELOW_FIRST_YEAR_RATE",
      p.firstYearDaysPerMonth.rule, d));
  }
  return out;
}

function carryWarning(f: LeavePolicyFacts, p: TimeParams): TimeFlag[] {
  const cap = f.carryOverMaxDays;
  const days = f.annualDays;
  if (cap === null || days === null) return [];
  if (cap * 10000 <= days * p.carryOverMaxShareBps.v) return [];
  return [warn("CARRY_OVER_ABOVE_HALF", p.carryOverMaxShareBps.rule,
    { carryOverMaxDays: String(cap), annualDays: String(days) })];
}

function kindWarnings(f: LeavePolicyFacts, p: TimeParams): TimeFlag[] {
  const days = f.annualDays;
  if (days === null) return [];
  const d = { annualDays: String(days) };
  if (f.payrollKind === "sick" && days !== p.sickLeaveMaxDaysPerYear.v) {
    return [warn("SICK_DAYS_DIFFER_FROM_LAW",
      p.sickLeaveMaxDaysPerYear.rule, d)];
  }
  if (f.payrollKind === "maternity") {
    return [warn("MATERNITY_IS_PER_BIRTH", p.maternityLeaveDays.rule, d)];
  }
  return [];
}

/** Statutory warnings for a leave policy; they never block a save. */
export function checkLeavePolicy(f: LeavePolicyFacts, p: TimeParams):
  TimeFlag[] {
  const annual = f.payrollKind === "annual" && f.annualDays !== null
    ? annualWarnings(f, f.annualDays, p) : [];
  return [...annual, ...carryWarning(f, p), ...kindWarnings(f, p)];
}
