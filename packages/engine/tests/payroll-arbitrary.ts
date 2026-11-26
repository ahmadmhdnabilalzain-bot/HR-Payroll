import fc from "fast-check";
import { daysInMonth } from "../src/dates";
import { fils } from "../src/money";
import { expectedFixingMonth } from "../src/payroll/gpssa";
import type {
  Absence,
  AllowanceKind,
  DeductionKind,
  GpssaInput,
  OvertimeEntry,
  PayslipInput,
  RestDayWork,
} from "../src/payroll/types";
import type { ParamValue } from "../src/rules/types";

export interface Case { input: PayslipInput;
  ov: Record<string, ParamValue> | undefined }

const YEAR = 2026;
const day = (m: number, d: number) =>
  `${YEAR}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const money = (max: bigint, min = 0n) =>
  fc.bigInt({ min, max }).map((v) => fils(v));

const DAY_KIND = fc.constantFrom("none", "none", "none", "unpaid", "sick",
  "maternity", "overtime", "rest-day");
const DAY = fc.record({ kind: DAY_KIND, minutes: fc.integer({ min: 1,
  max: 1440 }), night: fc.integer({ min: 0, max: 1440 }),
  holiday: fc.boolean(), pay: fc.boolean() });
type Day = { kind: string; minutes: number; night: number;
  holiday: boolean; pay: boolean };

const ALLOWANCE = fc.record({ kind: fc.constantFrom<AllowanceKind>(
  "housing", "conveyance", "medical", "passage", "other"),
  monthly: money(1000000000n) });
const DEDUCTION = fc.record({ kind: fc.constantFrom<DeductionKind>(
  "overpayment", "violation", "damage", "court-debt", "scheme"),
  amount: money(1000000000n, 1n) });
const LOAN = fc.record({ instalment: money(1000000000n, 1n),
  balance: money(1000000000n) });
const GPSSA = fc.record({ regime: fc.constantFrom<GpssaInput["regime"]>(
  "dl57-2023", "law7-1999"), fixingBasic: money(1000000000n),
  fixingAllowances: money(1000000000n), arrears: money(100000000n),
  base: fc.constantFrom("basic", "wage") });

const SPAN = fc.record({ month: fc.integer({ min: 1, max: 12 }),
  join: fc.integer({ min: 0, max: 31 }), leave: fc.integer({ min: 0,
    max: 31 }), probation: fc.integer({ min: -1, max: 31 }) });

/** Day entries for the employed span; one category per date. */
function entries(m: number, from: number, to: number, days: Day[]) {
  const absences: Absence[] = [];
  const overtime: OvertimeEntry[] = [];
  const rest: RestDayWork[] = [];
  for (let d = from; d <= to; d += 1) {
    const x = days[d - 1]!;
    const date = day(m, d);
    if (["unpaid", "sick", "maternity"].includes(x.kind)) {
      absences.push({ date, kind: x.kind as Absence["kind"] });
    } else if (x.kind === "overtime" && overtime.length < 3) {
      overtime.push({ date, minutes: x.minutes,
        nightMinutes: Math.min(x.night, x.minutes) });
    } else if (x.kind === "rest-day") {
      rest.push({ date, kind: x.holiday ? "holiday" : "rest-day",
        compensation: x.pay ? "pay" : "day-off" });
    }
  }
  return { absences, overtime, rest };
}

interface Raw { span: { month: number; join: number; leave: number;
  probation: number }; days: Day[]; basic: bigint;
  allowances: { kind: AllowanceKind; monthly: bigint }[];
  hours: number; shift: boolean; sick: number; maternity: number;
  encash: number; deductions: { kind: DeductionKind; amount: bigint }[];
  loans: { instalment: bigint; balance: bigint }[];
  national: boolean; gpssa: { regime: GpssaInput["regime"];
    fixingBasic: bigint; fixingAllowances: bigint; arrears: bigint;
    base: string } }

function build(r: Raw): Case {
  const m = r.span.month;
  const dim = daysInMonth(YEAR, m);
  const from = r.span.join === 0 ? 1 : Math.min(r.span.join, dim);
  const joiningDate = r.span.join === 0 ? "2020-03-01" : day(m, from);
  const leaves = r.span.leave !== 0 && r.span.leave >= from;
  const to = leaves ? Math.min(r.span.leave, dim) : dim;
  const p = r.span.probation;
  const early = r.span.join === 0 ? "2020-06-01" : null;
  const probationEndDate = p < 0 ? null
    : p === 0 ? early : day(m, Math.max(Math.min(p, dim), from));
  const e = entries(m, from, to, r.days);
  const gp = r.gpssa;
  const gpssa = r.national ? { regime: gp.regime, fixingBasic:
    fils(gp.fixingBasic), fixingAllowances: fils(gp.fixingAllowances),
    arrears: fils(gp.arrears),
    fixingMonth: expectedFixingMonth(joiningDate, YEAR) } : null;
  const input: PayslipInput = { year: YEAR, month: m,
    employee: { workerClass: r.national ? "uae-national"
      : "expat-full-time", joiningDate,
    leavingDate: leaves ? day(m, to) : null, probationEndDate,
    shiftWorker: r.shift, normalHoursPerDay: r.hours,
    basicMonthly: fils(r.basic), gpssa,
    allowances: r.allowances.map((a, i) => ({ code: `A${i}`,
      kind: a.kind, monthly: fils(a.monthly) })) },
  absences: e.absences, overtime: e.overtime, restDayWork: e.rest,
  sickDaysUsedBefore: r.sick, maternityDaysUsedBefore: r.maternity,
  encashLeaveDays: leaves ? 0 : r.encash,
  deductions: r.deductions.map((d, i) => ({ ref: `D${i}`, kind: d.kind,
    amount: fils(d.amount), consentOnFile: true })),
  loans: r.loans.map((l, i) => ({ ref: `L${i}`, consentOnFile: true,
    instalment: fils(l.instalment), balance: fils(l.balance) })) };
  const ov = r.national ? { gpssaContributionSalaryBase: gp.base }
    : undefined;
  return { input, ov };
}

/** A valid expat, or a UAE national with the salary-base override. */
export const payslipCase: fc.Arbitrary<Case> = fc.record({
  span: SPAN, days: fc.array(DAY, { minLength: 31, maxLength: 31 }),
  basic: fc.bigInt({ min: 1n, max: 1000000000n }),
  allowances: fc.array(ALLOWANCE, { maxLength: 3 }),
  hours: fc.integer({ min: 1, max: 8 }), shift: fc.boolean(),
  sick: fc.integer({ min: 0, max: 120 }),
  maternity: fc.integer({ min: 0, max: 120 }),
  encash: fc.integer({ min: 0, max: 5 }),
  deductions: fc.array(DEDUCTION, { maxLength: 4 }),
  loans: fc.array(LOAN, { maxLength: 2 }), national: fc.boolean(),
  gpssa: GPSSA,
}).map((r) => build(r as Raw));
