import {
  fils,
  type Allowance,
  type Fils,
  type GpssaInput,
  type ParamValue,
  type PayslipInput,
} from "@payroll/engine";
import { monthKey } from "./calendar";
import type { CaseTag, DemoEmployee } from "./types";

/** The unpaid-leave case: three working days (Monday to Wednesday). */
export const UNPAID_DATES = ["2026-10-12", "2026-10-13", "2026-10-14"];

/** The overtime case; 20 October is over the 2-hour daily limit. */
export const OVERTIME = [
  { date: "2026-10-06", minutes: 120, nightMinutes: 0 },
  { date: "2026-10-07", minutes: 90, nightMinutes: 0 },
  { date: "2026-10-20", minutes: 150, nightMinutes: 0 },
  { date: "2026-10-21", minutes: 120, nightMinutes: 60 },
];

export const LOAN = { ref: "LN-1001", instalment: fils(50000n),
  balance: fils(300000n), consentOnFile: true };

/**
 * gpssaContributionSalaryBase is unsourced (DL57 5(2) does not settle
 * basic against basic plus allowances), so the engine refuses to run
 * a national's payslip without a value. The demo supplies "basic" and
 * says so; every national's payslip carries OVERRIDE_USED.
 */
export const GPSSA_ASSUMPTION = { key: "gpssaContributionSalaryBase",
  value: "basic", reason: "Unsourced in the GPSSA pack; the demo " +
    "assumes basic salary. Confirm with counsel before real use." };

export function overridesFor(e: DemoEmployee)
  : Record<string, ParamValue> | undefined {
  return e.workerClass === "uae-national"
    ? { [GPSSA_ASSUMPTION.key]: GPSSA_ASSUMPTION.value } : undefined;
}

const sumAllowances = (a: Allowance[]): Fils =>
  fils(a.reduce((s, x) => s + x.monthly, 0n));

/** DL57 covers those insured from 31 October 2023; earlier: Law 7. */
function gpssaOf(e: DemoEmployee): GpssaInput | null {
  if (e.workerClass !== "uae-national") return null;
  const joinedYear = Number(e.joiningDate.slice(0, 4));
  const fixingMonth = joinedYear === 2026
    ? e.joiningDate.slice(0, 7) : "2026-01";
  return { regime: e.joiningDate >= "2023-10-31" ? "dl57-2023"
    : "law7-1999", fixingMonth, fixingBasic: e.basicMonthly,
  fixingAllowances: sumAllowances(e.allowances), arrears: fils(0n) };
}

export interface InputOpts { year: number; month: number;
  basic?: Fils; extra?: Allowance[] }

/** One month's payslip input for `e`, cases applied. */
export function payslipInput(e: DemoEmployee, o: InputOpts)
  : PayslipInput {
  const inMonth = (d: string) => d.startsWith(monthKey(o.year, o.month));
  const has = (t: CaseTag) => e.cases.includes(t);
  return { year: o.year, month: o.month,
    employee: { workerClass: e.workerClass, joiningDate: e.joiningDate,
      leavingDate: e.leavingDate, probationEndDate: e.probationEndDate,
      shiftWorker: false, normalHoursPerDay: 8,
      basicMonthly: o.basic ?? e.basicMonthly,
      allowances: [...e.allowances, ...(o.extra ?? [])],
      gpssa: gpssaOf(e) },
    absences: has("unpaid-leave") ? UNPAID_DATES.filter(inMonth)
      .map((date) => ({ date, kind: "unpaid" as const })) : [],
    sickDaysUsedBefore: 0, maternityDaysUsedBefore: 0,
    overtime: has("overtime") ? OVERTIME.filter((x) => inMonth(x.date))
      : [],
    restDayWork: [], encashLeaveDays: 0, deductions: [],
    loans: has("loan") ? [LOAN] : [] };
}
