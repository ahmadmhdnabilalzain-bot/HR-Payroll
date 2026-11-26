import {
  calculateSettlement,
  daysInMonth,
  fils,
  GRATUITY_PACKS,
  mulDiv,
  parseIsoDate,
  requireParam,
  selectPack,
  traceRule,
  type RoundingMode,
} from "@payroll/engine";
import type { DemoEmployee, DemoLeaveRequest, DemoSettlement } from "./types";

/** How the leaver's unused leave is counted, said in the trace. */
export const LEAVE_BASIS = "our reading: the law gives leave for parts " +
  "of the last year but no method";

/** Unused annual leave at exit as an exact fraction of days. */
export interface UnusedLeave { num: bigint; den: bigint; fullMonths: number;
  daysInLastMonth: number; workedInLastMonth: number; takenDays: number }

/**
 * Accrual through the last working day: 30 days a year, each full
 * month of the year credited, and the month of leaving credited by the
 * days worked in it (15 of 31). Taken annual leave this year is
 * subtracted. Nothing is rounded here.
 */
export function unusedLeaveAtExit(e: DemoEmployee,
  reqs: DemoLeaveRequest[], annualDays: number): UnusedLeave {
  const last = parseIsoDate(e.leavingDate!);
  const joined = parseIsoDate(e.joiningDate);
  const fromMonth = joined.y < last.y ? 1 : joined.m + 1;
  const fullMonths = Math.max(0, last.m - fromMonth);
  const dim = daysInMonth(last.y, last.m);
  const takenDays = reqs.filter((r) => r.employeeId === e.id &&
    r.leaveTypeId === "lt-annual" && r.status === "approved" &&
    r.startDate.startsWith(String(last.y)))
    .reduce((s, r) => s + r.halves, 0) / 2;
  const den = BigInt(12 * dim);
  const accrued = BigInt(annualDays) * BigInt(fullMonths * dim + last.d);
  const num = accrued - BigInt(Math.round(takenDays * 2)) *
    BigInt(6 * dim);
  return { num: num < 0n ? 0n : num, den, fullMonths,
    daysInLastMonth: dim, workedInLastMonth: last.d, takenDays };
}

/**
 * Unused days for display, two decimals, half up: the one figure the
 * leave screens and the settlement both show.
 */
export function leaveDaysOf(u: UnusedLeave): number {
  const hundredths = (u.num * 200n + u.den) / (2n * u.den);
  return Number(hundredths) / 100;
}

/**
 * Gratuity from calculateSettlement (unchanged). Leave pay: basic /
 * leavePayDivisor x unused days, with the gratuity pack's own base,
 * divisor and rounding (half up), rounded once in fils.
 */
export function settlementOf(e: DemoEmployee, reqs: DemoLeaveRequest[],
  annualDays: number): DemoSettlement {
  const g = calculateSettlement({ gratuity: {
    joiningDate: e.joiningDate, lastWorkingDate: e.leavingDate!,
    unpaidLeaveDays: 0, lastBasicMonthly: e.basicMonthly,
    workerClass: e.workerClass }, unusedLeaveDays: 0 }, GRATUITY_PACKS);
  const pack = selectPack(GRATUITY_PACKS, e.leavingDate!);
  const divisor = requireParam(pack, "leavePayDivisor");
  const base = requireParam(pack, "leavePayBase");
  const mode = requireParam(pack, "roundingMode");
  const u = unusedLeaveAtExit(e, reqs, annualDays);
  const leavePay = mulDiv(e.basicMonthly, u.num,
    u.den * BigInt(Number(divisor.value)), mode.value as RoundingMode);
  const total = fils(g.value.gratuity + leavePay);
  const days = leaveDaysOf(u).toFixed(2);
  const trace = [...g.trace.filter((l) => l.id !== "leave.pay" &&
    l.id !== "settlement.total"),
  { id: "leave.accrued", label: "Unused annual leave at exit",
    formula: "annualDays x (fullMonths + workedInLastMonth / " +
      "daysInLastMonth) / 12 - takenDays",
    inputs: { annualDays: String(annualDays),
      fullMonths: String(u.fullMonths),
      workedInLastMonth: String(u.workedInLastMonth),
      daysInLastMonth: String(u.daysInLastMonth),
      takenDays: String(u.takenDays), basis: LEAVE_BASIS },
    result: `${u.num}/${u.den} days (${days})`, rules: [] },
  { id: "leave.pay", label: "Unused leave pay",
    formula: "lastBasicMonthly / leavePayDivisor x unused days, rounded " +
      "once", inputs: { lastBasicMonthly: String(e.basicMonthly),
      unusedDays: `${u.num}/${u.den}`, leavePayBase: String(base.value),
      roundingMode: String(mode.value) },
    result: String(leavePay),
    rules: [traceRule(base), traceRule(divisor), traceRule(mode)] },
  { id: "settlement.total", label: "Computed total (excludes notice " +
    "pay, deductions and other dues)", formula: "gratuity + leavePay",
  inputs: { gratuity: String(g.value.gratuity),
    leavePay: String(leavePay) }, result: String(total), rules: [] }];
  return { employeeId: e.id, unusedLeaveDays: Number(days),
    unusedLeaveBasis: LEAVE_BASIS,
    result: { ...g.value, leavePay, total }, trace };
}
