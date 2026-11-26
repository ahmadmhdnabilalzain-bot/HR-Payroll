import {
  fils,
  type Allowance,
  type Fils,
  type PayslipInput,
} from "@payroll/engine";
import { monthKey } from "./calendar";
import type { CaseTag, DemoEmployee } from "./types";

/** The unpaid-leave case: three working days (Monday to Wednesday). */
export const UNPAID_DATES = ["2026-10-12", "2026-10-13", "2026-10-14"];

/** The probation hire's sick day (sick pay is not due in probation). */
export const PROBATION_SICK_DATE = "2026-10-20";

/** Operations overtime; 20 October is over the 2-hour daily limit. */
export const OVERTIME = [
  { date: "2026-10-06", minutes: 120, nightMinutes: 0 },
  { date: "2026-10-07", minutes: 90, nightMinutes: 0 },
  { date: "2026-10-20", minutes: 150, nightMinutes: 0 },
];

/** IT night work (a system upgrade after 22:00). */
export const NIGHT_OVERTIME = [
  { date: "2026-10-15", minutes: 90, nightMinutes: 90 },
  { date: "2026-10-22", minutes: 60, nightMinutes: 60 },
];

/** A staff loan instalment larger than the deduction cap allows. */
export const LOAN = { ref: "LN-2041", instalment: fils(600000n),
  balance: fils(2400000n), consentOnFile: true };

export interface InputOpts { year: number; month: number;
  basic?: Fils; extra?: Allowance[] }

function variable(has: (t: CaseTag) => boolean, inMonth: (d: string) =>
  boolean) {
  return [...(has("overtime") ? OVERTIME : []),
    ...(has("night-overtime") ? NIGHT_OVERTIME : [])]
    .filter((x) => inMonth(x.date));
}

function absences(has: (t: CaseTag) => boolean,
  inMonth: (d: string) => boolean) {
  const unpaid = has("unpaid-leave") ? UNPAID_DATES.map((date) =>
    ({ date, kind: "unpaid" as const })) : [];
  const sick = has("probation") ? [{ date: PROBATION_SICK_DATE,
    kind: "sick" as const }] : [];
  return [...unpaid, ...sick].filter((a) => inMonth(a.date));
}

/**
 * One month's payslip input for `e`, cases applied. GPSSA input is
 * always null: nationals' pension is not computed in this demo (see
 * PENSION_NOT_COMPUTED).
 */
export function payslipInput(e: DemoEmployee, o: InputOpts)
  : PayslipInput {
  const inMonth = (d: string) => d.startsWith(monthKey(o.year, o.month));
  const has = (t: CaseTag) => e.cases.includes(t);
  return { year: o.year, month: o.month,
    employee: { workerClass: e.workerClass, joiningDate: e.joiningDate,
      leavingDate: e.leavingDate, probationEndDate: e.probationEndDate,
      shiftWorker: false, normalHoursPerDay: 8,
      basicMonthly: o.basic ?? e.basicMonthly,
      allowances: [...e.allowances, ...(o.extra ?? [])], gpssa: null },
    absences: absences(has, inMonth),
    sickDaysUsedBefore: 0, maternityDaysUsedBefore: 0,
    overtime: variable(has, inMonth), restDayWork: [], encashLeaveDays: 0,
    deductions: [], loans: has("loan-over-cap") ? [LOAN] : [] };
}
