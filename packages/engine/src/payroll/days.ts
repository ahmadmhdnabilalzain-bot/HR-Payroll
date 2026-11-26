import { daysBetween } from "../dates";
import type { TraceBuilder } from "../trace";
import type { TraceRule } from "../trace-types";
import type { PayrollParams } from "./params";
import type {
  AbsenceKind,
  PayslipFlag,
  PayslipInput,
  PayWindow,
} from "./types";

export interface LeaveSteps { fullPay: number; halfPay: number;
  unpaid: number; beyond: number; probation: number;
  usedAfter: number }
export interface DayAccount { employedDays: number;
  unpaidDays: number; halfPayDays: number; paidHalfDays: bigint;
  totalHalfDays: bigint; sick: LeaveSteps | null;
  maternity: LeaveSteps | null; flags: PayslipFlag[] }

/** Last ordinal (days used this year) of each pay step. */
interface Steps { fullEnd: number; halfEnd: number; unpaidEnd: number }

function datesOf(input: PayslipInput, kind: AbsenceKind): string[] {
  return input.absences.filter((a) => a.kind === kind)
    .map((a) => a.date).sort();
}

/** Days in date order; probation days are unpaid and not counted. */
function stepDays(days: string[], usedBefore: number, s: Steps,
  probationEnd: string | null): LeaveSteps {
  const r = { fullPay: 0, halfPay: 0, unpaid: 0, beyond: 0, probation: 0,
    usedAfter: usedBefore };
  for (const day of days) {
    if (probationEnd !== null && day <= probationEnd) {
      r.probation += 1;
      continue;
    }
    r.usedAfter += 1;
    const n = r.usedAfter;
    if (n <= s.fullEnd) r.fullPay += 1;
    else if (n <= s.halfEnd) r.halfPay += 1;
    else if (n <= s.unpaidEnd) r.unpaid += 1;
    else r.beyond += 1;
  }
  return r;
}

function sickSteps(input: PayslipInput, p: PayrollParams):
  LeaveSteps | null {
  const days = datesOf(input, "sick");
  if (days.length === 0) return null;
  const full = Number(p.sickFullPayDays.v);
  const s = { fullEnd: full, halfEnd: full + Number(p.sickHalfPayDays.v),
    unpaidEnd: Number(p.sickMaxDays.v) };
  const probation = p.sickPaidInProbation.v ? null
    : input.employee.probationEndDate;
  return stepDays(days, input.sickDaysUsedBefore, s, probation);
}

function maternitySteps(input: PayslipInput, p: PayrollParams):
  LeaveSteps | null {
  const days = datesOf(input, "maternity");
  if (days.length === 0) return null;
  const full = Number(p.maternityFullPayDays.v);
  const half = full + Number(p.maternityHalfPayDays.v);
  const s = { fullEnd: full, halfEnd: half,
    unpaidEnd: half + Number(p.maternityUnpaidExtraDays.v) };
  return stepDays(days, input.maternityDaysUsedBefore, s, null);
}

function traceLeave(t: TraceBuilder, id: string, label: string,
  l: LeaveSteps, usedBefore: number, rules: TraceRule[]): void {
  t.add({ id, label,
    formula: "each day in date order by its ordinal in the year: full " +
      "pay, then half pay, then unpaid; days beyond the law are unpaid",
    inputs: { fullPay: String(l.fullPay), halfPay: String(l.halfPay),
      unpaid: String(l.unpaid), beyond: String(l.beyond),
      probation: String(l.probation), usedBefore: String(usedBefore),
      usedAfter: String(l.usedAfter) },
    result: String(l.usedAfter), rules });
}

function overMax(code: string, what: string, l: LeaveSteps | null,
  max: bigint): PayslipFlag[] {
  if (l === null || l.beyond === 0) return [];
  return [{ code, message: `${what} beyond the ${max} days in the law ` +
    "is unpaid", detail: { beyond: String(l.beyond),
    max: String(max), usedAfter: String(l.usedAfter) } }];
}

function traceSteps(t: TraceBuilder, input: PayslipInput,
  p: PayrollParams, sick: LeaveSteps | null, mat: LeaveSteps | null): void {
  if (sick !== null) {
    traceLeave(t, "leave.sick", "Sick leave this month", sick,
      input.sickDaysUsedBefore, [p.sickFullPayDays.rule,
        p.sickHalfPayDays.rule, p.sickMaxDays.rule,
        p.sickPaidInProbation.rule]);
  }
  if (mat !== null) {
    traceLeave(t, "leave.maternity", "Maternity leave this month", mat,
      input.maternityDaysUsedBefore, [p.maternityFullPayDays.rule,
        p.maternityHalfPayDays.rule, p.maternityUnpaidExtraDays.rule]);
  }
}

interface Counts { employedDays: number; unpaidDays: number;
  halfPayDays: number; daysInMonth: number }

function halfDays(t: TraceBuilder, p: PayrollParams, c: Counts) {
  const paidHalfDays = BigInt(2 * c.employedDays - 2 * c.unpaidDays -
    c.halfPayDays);
  const totalHalfDays = BigInt(2 * c.daysInMonth);
  t.add({ id: "payroll.days", label: "Paid half-days of the month",
    formula: "2 * employedDays - 2 * unpaidDays - halfPayDays, over " +
      "2 * daysInMonth",
    inputs: { employedDays: String(c.employedDays),
      unpaidDays: String(c.unpaidDays),
      halfPayDays: String(c.halfPayDays) },
    result: `${paidHalfDays}/${totalHalfDays}`,
    rules: [p.prorationBasis.rule, p.paidLeaveBase.rule] });
  return { paidHalfDays, totalHalfDays };
}

const unpaidOf = (l: LeaveSteps | null): number =>
  l === null ? 0 : l.unpaid + l.beyond + l.probation;

/** Paid half-days of the month, after unpaid and half-pay days. */
export function accountDays(input: PayslipInput, w: PayWindow,
  p: PayrollParams, t: TraceBuilder): DayAccount {
  const employedDays = daysBetween(w.payStart, w.payEnd) + 1;
  t.add({ id: "payroll.period", label: "Days in the pay period",
    formula: "payEnd - payStart + 1",
    inputs: { payStart: w.payStart, payEnd: w.payEnd,
      daysInMonth: String(w.daysInMonth) },
    result: String(employedDays),
    rules: [p.prorationBasis.rule, p.maxNormalHoursPerDay.rule] });
  const sick = sickSteps(input, p);
  const maternity = maternitySteps(input, p);
  traceSteps(t, input, p, sick, maternity);
  const unpaidAbsences = datesOf(input, "unpaid").length;
  const unpaidDays = unpaidAbsences + unpaidOf(sick) + unpaidOf(maternity);
  const halfPayDays = (sick?.halfPay ?? 0) + (maternity?.halfPay ?? 0);
  const halves = halfDays(t, p, { employedDays, unpaidDays, halfPayDays,
    daysInMonth: w.daysInMonth });
  const flags = [
    ...overMax("SICK_LEAVE_OVER_MAX", "sick leave", sick, p.sickMaxDays.v),
    ...overMax("MATERNITY_LEAVE_OVER_MAX", "maternity leave", maternity,
      p.maternityFullPayDays.v + p.maternityHalfPayDays.v +
      p.maternityUnpaidExtraDays.v)];
  return { employedDays, unpaidDays, halfPayDays, ...halves, sick,
    maternity, flags };
}
