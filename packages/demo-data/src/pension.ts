import {
  accountDays,
  applyDeductions,
  DEFAULT_PAYROLL_PACKS,
  fils,
  fixedEarnings,
  formatIsoDate,
  loadPayrollParams,
  NOT_COMPUTED,
  notApplicableFor,
  selectPack,
  TraceBuilder,
  validatePayslipInput,
  variableEarnings,
  type Fils,
  type Payslip,
  type PayslipInput,
  type Traced,
} from "@payroll/engine";

/**
 * THE one place for the nationals' pension wording. Official sources
 * say a separate Abu Dhabi pension fund covers UAE nationals employed
 * in Abu Dhabi; the engine's pack models the federal fund (GPSSA);
 * which applies to private-bank staff in Abu Dhabi is unconfirmed.
 */
export const PENSION_NOT_COMPUTED = {
  code: "PENSION_NOT_COMPUTED",
  en: "Pension for UAE nationals employed in Abu Dhabi may fall under " +
    "the Abu Dhabi pension fund rather than the federal fund; the rate " +
    "is confirmed with the fund before payroll. Not included in this " +
    "figure.",
  // NEEDS NATIVE REVIEW
  ar: "قد يخضع معاش المواطنين الإماراتيين العاملين في أبوظبي لصندوق " +
    "أبوظبي للمعاشات بدلًا من الصندوق الاتحادي؛ ويُؤكَّد المعدل مع " +
    "الصندوق قبل صرف الرواتب. غير مشمول في هذا الرقم.",
  arReviewed: false,
} as const;

const sum = (xs: { amount: Fils }[]): Fils =>
  fils(xs.reduce((s, x) => s + x.amount, 0n));

function total(t: TraceBuilder, id: string, label: string,
  formula: string, inputs: Record<string, string>, value: Fils): void {
  t.add({ id, label, formula, inputs, result: String(value), rules: [] });
}

/**
 * A UAE national's month through the engine's own steps (days,
 * earnings, deductions), without the GPSSA step: the same code
 * calculatePayslip runs, minus pension. The payslip lists
 * PENSION_NOT_COMPUTED, and its trace has a visible "not computed"
 * line, so the missing pension is never a silent zero.
 */
export function payslipWithoutPension(input: PayslipInput)
  : Traced<Payslip> {
  const onDate = formatIsoDate({ y: input.year, m: input.month, d: 1 });
  const p = loadPayrollParams(selectPack(DEFAULT_PAYROLL_PACKS.payroll,
    onDate), undefined);
  // The validator asks nationals for GPSSA input; that check is the
  // pension step, so it is run on an otherwise identical copy.
  const w = validatePayslipInput({ ...input, employee: { ...input.employee,
    workerClass: "expat-full-time" } }, p);
  const t = new TraceBuilder();
  const d = accountDays(input, w, p, t);
  const fixed = fixedEarnings(input, d, p, t);
  const v = variableEarnings(input, p, t);
  const earnings = [...fixed, ...v.lines];
  total(t, "earn.gross", "Gross pay", "sum of the earnings lines",
    { lines: String(earnings.length) }, sum(earnings));
  t.add({ id: "pension.not-computed", label: "Pension: not computed",
    formula: "not computed", inputs: { reason: PENSION_NOT_COMPUTED.en },
    result: "not computed", rules: [] });
  const e = input.employee;
  const ded = applyDeductions({ earnedWage: sum(fixed),
    contractualWage: fils(e.basicMonthly + sum(e.allowances.map((a) =>
      ({ amount: a.monthly })))), requests: input.deductions,
    loans: input.loans, gpssaShare: null,
    atExit: e.leavingDate !== null && e.leavingDate <= w.monthEnd }, p, t);
  const gross = sum(earnings);
  const net = fils(gross - ded.total);
  total(t, "pay.net", "Net pay", "gross - total deductions",
    { gross: String(gross), deductions: String(ded.total) }, net);
  total(t, "employer.total", "Employer cost on top of gross pay",
    "sum of the employer lines", { lines: "0" }, fils(0n));
  return { trace: t.lines(), value: { year: input.year,
    month: input.month, workerClass: e.workerClass, payStart: w.payStart,
    payEnd: w.payEnd, daysInPeriod: d.employedDays,
    unpaidDays: d.unpaidDays, earnings, deductions: ded.lines,
    employerCosts: [], gross, totalDeductions: ded.total, net,
    employerCost: fils(0n), caps: ded.caps, deferred: ded.deferred,
    loanBalances: ded.loanBalances,
    flags: [...d.flags, ...v.flags, ...ded.flags],
    notComputed: [PENSION_NOT_COMPUTED.en, ...NOT_COMPUTED],
    notApplicable: notApplicableFor(e.workerClass) } };
}
