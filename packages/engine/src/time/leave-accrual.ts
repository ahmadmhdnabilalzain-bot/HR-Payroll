import { daysInMonth, formatIsoDate, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import type { TraceRule } from "../trace-types";
import type { TimeParams } from "./params";
import type {
  BalanceInput,
  BalanceResult,
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

/**
 * Carried halves are used first (convention); what is unused expires
 * after `carriedExpiresOn`. Taken entries all count, whatever their date.
 */
export function balanceHalves(b: BalanceInput): BalanceResult {
  const exp = b.carriedExpiresOn;
  if (exp !== null) parseIsoDate(exp, "carriedExpiresOn");
  parseIsoDate(b.asOf, "asOf");
  const takenHalves = b.taken.reduce((s, t) => s + t.halves, 0);
  const beforeExpiry = exp === null ? takenHalves : b.taken
    .filter((t) => t.date <= exp).reduce((s, t) => s + t.halves, 0);
  const carriedUsedHalves = Math.min(b.carriedHalves, beforeExpiry);
  const expiredHalves = exp !== null && b.asOf > exp
    ? b.carriedHalves - carriedUsedHalves : 0;
  const availableHalves = b.accruedHalves + b.carriedHalves -
    expiredHalves + b.adjustmentHalves - takenHalves - b.pendingHalves;
  return { takenHalves, carriedUsedHalves, expiredHalves,
    availableHalves };
}

export function carryOverHalves(remainingHalves: number,
  capHalves: number): number {
  return Math.min(Math.max(0, remainingHalves), capHalves);
}

function warn(code: string, rule: TraceRule,
  detail: Record<string, string>): TimeFlag {
  return { code, dates: [], detail, rule };
}

function annualWarnings(f: LeavePolicyFacts, days: number,
  p: TimeParams): TimeFlag[] {
  const d = { annualDays: String(days) };
  const out: TimeFlag[] = [];
  if (f.dayCount === "working") {
    out.push(warn("ANNUAL_BASIS_NOT_COMPARED", p.annualLeaveMinDays.rule,
      d));
  } else if (days < p.annualLeaveMinDays.v) {
    out.push(warn("ANNUAL_BELOW_STATUTORY", p.annualLeaveMinDays.rule, d));
  }
  // The plan's condition names no basis, so this runs on both.
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
