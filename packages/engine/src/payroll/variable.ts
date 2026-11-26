import { fils, mulDiv, type Fils } from "../money";
import type { TraceBuilder } from "../trace";
import type { TraceRule } from "../trace-types";
import type { PayrollParams } from "./params";
import type {
  EarningKind,
  PayslipFlag,
  PayslipInput,
  PayslipLine,
  RestDayWork,
} from "./types";

export interface VariablePay { lines: PayslipLine<EarningKind>[];
  flags: PayslipFlag[] }

type Line = PayslipLine<EarningKind>;

/** Contractual monthly basic and wage (basic plus every allowance). */
function rates(input: PayslipInput): { basic: Fils; wage: Fils } {
  const e = input.employee;
  const wage = e.allowances.reduce((s, a) => s + a.monthly,
    e.basicMonthly as bigint);
  return { basic: e.basicMonthly, wage: fils(wage) };
}

function capFlags(input: PayslipInput, p: PayrollParams): PayslipFlag[] {
  const max = p.overtimeMaxMinutesPerDay.v;
  return input.overtime.filter((o) => BigInt(o.minutes) > max)
    .map((o) => ({ code: "OVERTIME_DAILY_CAP_EXCEEDED",
      message: `overtime above ${max} minutes a day (Decree-Law 33/2021 ` +
        "Art 19(1)); every minute is still paid",
      detail: { date: o.date, minutes: String(o.minutes),
        maxMinutes: String(max) } }));
}

interface OtPart { id: string; label: string; minutes: number;
  uplift: { v: bigint; rule: TraceRule }; extra: TraceRule[] }

function overtimeLine(input: PayslipInput, p: PayrollParams,
  t: TraceBuilder, part: OtPart): Line {
  const basic = input.employee.basicMonthly;
  const hours = BigInt(input.employee.normalHoursPerDay);
  const num = BigInt(part.minutes) * (10000n + part.uplift.v);
  const den = p.dailyDivisor.v * hours * 60n * 10000n;
  const amount = mulDiv(basic, num, den, p.roundingMode.v);
  t.add({ id: part.id, label: part.label,
    formula: "basicMonthly * minutes * (10000 + upliftBps) / " +
      "(dailyDivisor * hoursPerDay * 60 * 10000), rounded once",
    inputs: { minutes: String(part.minutes),
      upliftBps: String(part.uplift.v), hoursPerDay: String(hours),
      basicMonthly: String(basic), dailyDivisor: String(p.dailyDivisor.v) },
    result: String(amount),
    rules: [part.uplift.rule, p.dailyDivisor.rule, p.roundingMode.rule,
      ...part.extra] });
  return { traceId: part.id, kind: "overtime", label: part.label, amount };
}

function overtime(input: PayslipInput, p: PayrollParams,
  t: TraceBuilder): VariablePay {
  const night = input.overtime.reduce((s, o) => s + o.nightMinutes, 0);
  const all = input.overtime.reduce((s, o) => s + o.minutes, 0);
  const shift = input.employee.shiftWorker &&
    p.shiftWorkersNightExcluded.v;
  const normal = shift ? all : all - night;
  const nightPaid = shift ? 0 : night;
  const extra = [p.shiftWorkersNightExcluded.rule,
    p.overtimeMaxMinutesPerDay.rule, p.maxNormalHoursPerDay.rule];
  const lines: Line[] = [];
  if (normal > 0) {
    lines.push(overtimeLine(input, p, t, { id: "earn.overtime.normal",
      label: "Overtime pay", minutes: normal, uplift: p.overtimeUpliftBps,
      extra }));
  }
  if (nightPaid > 0) {
    lines.push(overtimeLine(input, p, t, { id: "earn.overtime.night",
      label: "Night overtime pay", minutes: nightPaid,
      uplift: p.nightOvertimeUpliftBps,
      extra: [...extra, p.nightWindow.rule] }));
  }
  const shiftFlag = shift && night > 0 ? [shiftNightFlag(night)] : [];
  return { lines, flags: [...capFlags(input, p), ...shiftFlag] };
}

function shiftNightFlag(night: number): PayslipFlag {
  return { code: "SHIFT_WORKER_NIGHT_RATE",
    message: "shift workers are excluded from the night overtime rate " +
      "(Decree-Law 33/2021 Art 19(3)); night minutes are paid at the " +
      "normal overtime rate", detail: { nightMinutes: String(night) } };
}

interface RestKind { kind: RestDayWork["kind"]; id: string; label: string;
  uplift: { v: bigint; rule: TraceRule } }

function restLine(input: PayslipInput, p: PayrollParams, t: TraceBuilder,
  k: RestKind): Line {
  const entries = input.restDayWork.filter((r) => r.kind === k.kind);
  const n = BigInt(entries.filter((r) => r.compensation === "pay").length);
  const off = entries.length - Number(n);
  const { basic, wage } = rates(input);
  const div = p.dailyDivisor.v * 10000n;
  const both = p.restDayPayMode.v === "extra-day-wage-plus-premium";
  const amount = both
    ? mulDiv(fils(wage * 10000n + basic * k.uplift.v), n, div,
      p.roundingMode.v)
    : mulDiv(basic, n * k.uplift.v, div, p.roundingMode.v);
  t.add({ id: k.id, label: k.label,
    formula: both ? "days * (wage + basicMonthly * upliftBps / 10000) / " +
      "dailyDivisor, rounded once" : "days * basicMonthly * upliftBps / " +
      "(dailyDivisor * 10000), rounded once",
    inputs: { days: String(n), daysOff: String(off),
      wage: String(wage), basicMonthly: String(basic),
      upliftBps: String(k.uplift.v), mode: p.restDayPayMode.v },
    result: String(amount),
    rules: [k.uplift.rule, p.restDayPayMode.rule, p.restDayWageBase.rule,
      p.dailyDivisor.rule, p.roundingMode.rule] });
  return { traceId: k.id, kind: k.kind, label: k.label, amount };
}

function restDays(input: PayslipInput, p: PayrollParams,
  t: TraceBuilder): Line[] {
  const kinds: RestKind[] = [
    { kind: "rest-day", id: "earn.rest-day",
      label: "Pay for work on rest days", uplift: p.restDayUpliftBps },
    { kind: "holiday", id: "earn.holiday",
      label: "Pay for work on official holidays",
      uplift: p.holidayUpliftBps },
  ];
  return kinds.filter((k) => input.restDayWork.some((r) =>
    r.kind === k.kind)).map((k) => restLine(input, p, t, k));
}

function encashment(input: PayslipInput, p: PayrollParams,
  t: TraceBuilder): Line[] {
  if (input.encashLeaveDays <= 0) return [];
  const { wage } = rates(input);
  const days = BigInt(input.encashLeaveDays);
  const amount = mulDiv(wage, days, p.dailyDivisor.v, p.roundingMode.v);
  const id = "earn.leave-encashment";
  const label = "Annual leave paid in cash";
  t.add({ id, label, formula: "wage * days / dailyDivisor, rounded once",
    inputs: { days: String(days), wage: String(wage),
      dailyDivisor: String(p.dailyDivisor.v) },
    result: String(amount),
    rules: [p.encashInServiceBase.rule, p.dailyDivisor.rule,
      p.roundingMode.rule] });
  return [{ traceId: id, kind: "leave-encashment", label, amount }];
}

/** Overtime, rest-day and holiday work, and in-service encashment. */
export function variableEarnings(input: PayslipInput, p: PayrollParams,
  t: TraceBuilder): VariablePay {
  const ot = overtime(input, p, t);
  const lines = [...ot.lines, ...restDays(input, p, t),
    ...encashment(input, p, t)];
  return { lines, flags: ot.flags };
}
