import { formatIsoDate } from "../dates";
import { EngineError } from "../errors";
import { deepFreeze } from "../freeze";
import { fils, type Fils } from "../money";
import { GPSSA_PACKS } from "../rules/gpssa-pack";
import { PAYROLL_PACKS } from "../rules/payroll-pack";
import { selectPack } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { Traced } from "../trace-types";
import { accountDays, type DayAccount } from "./days";
import { applyDeductions, type DeductionResult } from "./deductions";
import { fixedEarnings } from "./earnings";
import { computeGpssa, refuseGccNational, type GpssaResult } from "./gpssa";
import { NOT_COMPUTED, notApplicableFor } from "./not-computed";
import {
  loadGpssaParams,
  loadPayrollParams,
  overriddenKeys,
  type PayrollParams,
} from "./params";
import type {
  EarningKind,
  Payslip,
  PayslipFlag,
  PayslipInput,
  PayslipLine,
  PayWindow,
} from "./types";
import { checkPeriod, validatePayslipInput } from "./validate";
import { variableEarnings } from "./variable";

export interface PayrollPacks { payroll: readonly RulePack[];
  gpssa: readonly RulePack[] }

export const DEFAULT_PAYROLL_PACKS: PayrollPacks = deepFreeze({
  payroll: PAYROLL_PACKS, gpssa: GPSSA_PACKS });

type Ov = Record<string, ParamValue> | undefined;

const sum = (xs: { amount: Fils }[]): Fils =>
  fils(xs.reduce((s, x) => s + x.amount, 0n));

function total(t: TraceBuilder, id: string, label: string,
  formula: string, inputs: Record<string, string>, value: Fils): void {
  t.add({ id, label, formula, inputs, result: String(value), rules: [] });
}

function contractualWage(input: PayslipInput): Fils {
  const e = input.employee;
  return fils(e.basicMonthly + sum(e.allowances.map((a) =>
    ({ amount: a.monthly }))));
}

interface GpssaPart { result: GpssaResult; used: string[] }

function gpssaPart(input: PayslipInput, w: PayWindow, packs: PayrollPacks,
  ov: Ov, t: TraceBuilder): GpssaPart | null {
  const g = input.employee.gpssa;
  if (input.employee.workerClass !== "uae-national" || g === null) {
    return null;
  }
  const pack = selectPack(packs.gpssa, w.monthStart);
  const params = loadGpssaParams(pack, ov, g.regime);
  return { result: computeGpssa(input, w, params, t),
    used: overriddenKeys(params) };
}

/** Every override key must name a param of some pack (no typos). */
function checkOverrideKeys(packs: PayrollPacks, ov: Ov): void {
  const known = new Set([...packs.payroll, ...packs.gpssa]
    .flatMap((p) => Object.keys(p.params)));
  for (const key of Object.keys(ov ?? {})) {
    if (!known.has(key)) {
      throw new EngineError("UNKNOWN_OVERRIDE",
        `override ${key} names no param of the payroll or GPSSA packs`,
        { key });
    }
  }
}

/** Keys recorded as overridden when the params were loaded. */
function overrideFlags(used: string[], ov: Ov): PayslipFlag[] {
  const keys = [...new Set(used)].sort();
  const unused = Object.keys(ov ?? {}).filter((k) => !keys.includes(k))
    .sort();
  const flags: PayslipFlag[] = [];
  if (keys.length > 0) {
    flags.push({ code: "OVERRIDE_USED", message: "this payslip uses rule " +
      "values supplied by the caller, not the rule pack's own values",
      detail: { keys: keys.join(",") } });
  }
  if (unused.length > 0) {
    flags.push({ code: "OVERRIDE_UNUSED", message: "these overrides " +
      "were supplied but no rule on this payslip read them",
      detail: { keys: unused.join(",") } });
  }
  return flags;
}

interface Parts { w: PayWindow; earnings: PayslipLine<EarningKind>[];
  earned: Fils; days: DayAccount; flags: PayslipFlag[] }

function earn(input: PayslipInput, w: PayWindow, p: PayrollParams,
  t: TraceBuilder): Parts {
  const d = accountDays(input, w, p, t);
  const fixed = fixedEarnings(input, d, p, t);
  const v = variableEarnings(input, p, t);
  const earnings = [...fixed, ...v.lines];
  total(t, "earn.gross", "Gross pay", "sum of the earnings lines",
    { lines: String(earnings.length) }, sum(earnings));
  return { w, earnings, earned: sum(fixed), days: d,
    flags: [...d.flags, ...v.flags] };
}

/** One month's payslip: every money field has a trace line. */
export function calculatePayslip(input: PayslipInput,
  packs: PayrollPacks, overrides?: Record<string, ParamValue>,
): Traced<Payslip> {
  checkPeriod(input.year, input.month);
  checkOverrideKeys(packs, overrides);
  const onDate = formatIsoDate({ y: input.year, m: input.month, d: 1 });
  const p = loadPayrollParams(selectPack(packs.payroll, onDate), overrides);
  const w = validatePayslipInput(input, p);
  if (input.employee.workerClass === "gcc-national") {
    refuseGccNational(selectPack(packs.gpssa, onDate), overrides);
  }
  const t = new TraceBuilder();
  const e = earn(input, w, p, t);
  const gp = gpssaPart(input, w, packs, overrides, t);
  const ded = applyDeductions({ earnedWage: e.earned,
    contractualWage: contractualWage(input), requests: input.deductions,
    loans: input.loans, ...gpssaArgs(input, gp),
    atExit: input.employee.leavingDate !== null &&
      input.employee.leavingDate <= w.monthEnd }, p, t);
  const used = [...overriddenKeys(p), ...(gp?.used ?? [])];
  e.flags.push(...ded.flags, ...overrideFlags(used, overrides));
  return finish(input, e, ded, gp?.result ?? null, t);
}

function gpssaArgs(input: PayslipInput, gp: GpssaPart | null) {
  const arrears = input.employee.gpssa?.arrears;
  if (gp === null || arrears === undefined) return { gpssaShare: null };
  const g = gp.result;
  return { gpssaShare: fils(g.employeeShare + arrears),
    gpssaTrace: { share: g.employeeShare, arrears, rules: g.shareRules,
      regime: g.regime } };
}

function finish(input: PayslipInput, e: Parts, ded: DeductionResult,
  g: GpssaResult | null,
  t: TraceBuilder): Traced<Payslip> {
  const gross = sum(e.earnings);
  const net = fils(gross - ded.total);
  total(t, "pay.net", "Net pay", "gross - total deductions",
    { gross: String(gross), deductions: String(ded.total) }, net);
  const employerCosts = g === null ? [] : [g.employerLine];
  const employerCost = sum(employerCosts);
  total(t, "employer.total", "Employer cost on top of gross pay",
    "sum of the employer lines", { lines: String(employerCosts.length) },
    employerCost);
  const trace = t.lines();
  const value: Payslip = { year: input.year, month: input.month,
    workerClass: input.employee.workerClass, payStart: e.w.payStart,
    payEnd: e.w.payEnd, daysInPeriod: e.days.employedDays,
    unpaidDays: e.days.unpaidDays, earnings: e.earnings,
    deductions: ded.lines, employerCosts, gross,
    totalDeductions: ded.total, net, employerCost, caps: ded.caps,
    deferred: ded.deferred, loanBalances: ded.loanBalances,
    flags: e.flags,
    notComputed: [...NOT_COMPUTED],
    notApplicable: notApplicableFor(input.employee.workerClass) };
  return { value, trace };
}
