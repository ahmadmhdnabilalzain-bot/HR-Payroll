import {
  calculatePayslip,
  calculateSettlement,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatIsoDate,
  daysInMonth,
  GRATUITY_PACKS,
  type Fils,
} from "@payroll/engine";
import { DEMO_PERIOD, monthKey } from "./calendar";
import { payslipInput, type InputOpts } from "./pay-inputs";
import { PENSION_NOT_COMPUTED, payslipWithoutPension } from "./pension";
import { BACK_PAY_RAISE } from "./roster";
import type {
  BackPayDerivation,
  DemoEmployee,
  DemoPayRun,
  DemoPayslip,
  DemoSettlement,
  RunTotals,
} from "./types";

/** No IBAN: the payslip is computed but held out of the SIF. */
export const HELD_NO_IBAN = "No IBAN on file: this salary cannot go " +
  "in the WPS file until the bank details are entered.";

export function employedIn(e: DemoEmployee, year: number, month: number)
  : boolean {
  const first = formatIsoDate({ y: year, m: month, d: 1 });
  const last = formatIsoDate({ y: year, m: month,
    d: daysInMonth(year, month) });
  return e.joiningDate <= last &&
    (e.leavingDate === null || e.leavingDate >= first);
}

/** Expats: calculatePayslip. Nationals: the same steps, no pension. */
export function slipOf(e: DemoEmployee, o: InputOpts, id: string)
  : DemoPayslip {
  const input = payslipInput(e, o);
  const national = e.workerClass === "uae-national";
  const r = national ? payslipWithoutPension(input)
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS);
  return { id, employeeId: e.id, basis: national
    ? "engine-steps-without-pension" : "calculatePayslip", input,
  payslip: r.value, trace: r.trace, sif: e.iban === null
    ? { included: false, reason: HELD_NO_IBAN } : { included: true } };
}

/**
 * September was paid on the old basic; the raise was entered late.
 * Owed minus paid, both from the engine, is October's back pay.
 */
function backPayOf(e: DemoEmployee): BackPayDerivation {
  const o = { year: 2026, month: 9 };
  const paid = slipOf(e, { ...o,
    basic: fils(e.basicMonthly - BACK_PAY_RAISE) }, "bp-paid");
  const owed = slipOf(e, o, "bp-owed");
  return { employeeId: e.id, forMonth: monthKey(o.year, o.month),
    paidGross: paid.payslip.gross, owedGross: owed.payslip.gross,
    amount: fils(owed.payslip.gross - paid.payslip.gross),
    paidTrace: paid.trace, owedTrace: owed.trace };
}

function settlementOf(e: DemoEmployee, unusedLeaveDays: number)
  : DemoSettlement {
  const r = calculateSettlement({ gratuity: {
    joiningDate: e.joiningDate, lastWorkingDate: e.leavingDate!,
    unpaidLeaveDays: 0, lastBasicMonthly: e.basicMonthly,
    workerClass: e.workerClass }, unusedLeaveDays }, GRATUITY_PACKS);
  return { employeeId: e.id, unusedLeaveDays, result: r.value,
    trace: r.trace };
}

const sum = (xs: DemoPayslip[], f: (p: DemoPayslip) => Fils): Fils =>
  fils(xs.reduce((s, p) => s + f(p), 0n));

export function totalsOf(slips: DemoPayslip[]): RunTotals {
  return { payslips: slips.length,
    gross: sum(slips, (s) => s.payslip.gross),
    deductions: sum(slips, (s) => s.payslip.totalDeductions),
    net: sum(slips, (s) => s.payslip.net),
    employerCost: sum(slips, (s) => s.payslip.employerCost),
    heldNet: sum(slips.filter((s) => !s.sif.included),
      (s) => s.payslip.net) };
}

/** What the run does not compute, said once for the whole run. */
export const RUN_NOT_COMPUTED: readonly string[] = [
  PENSION_NOT_COMPUTED.en,
  "Final settlement: notice pay, deductions and other dues (listed on " +
    "the settlement).",
];

/**
 * October 2026, prepared by HR and waiting for the General Manager.
 * The leaver's gratuity and leave pay come from calculateSettlement
 * and stay outside the run total and the SIF.
 */
export function buildPayRun(employees: DemoEmployee[],
  unusedLeave: (employeeId: string) => number): DemoPayRun {
  const { year, month } = DEMO_PERIOD;
  const backPay = employees.filter((e) => e.cases.includes("back-pay"))
    .map(backPayOf);
  const extra = (e: DemoEmployee) => backPay.filter((b) =>
    b.employeeId === e.id).map((b) => ({ code: "back-pay",
    kind: "other" as const, monthly: b.amount }));
  const payslips = employees.filter((e) => employedIn(e, year, month))
    .map((e) => slipOf(e, { year, month, extra: extra(e) },
      `ps-${monthKey(year, month)}-${e.id}`));
  const settlements = employees.filter((e) => e.cases.includes("leaver"))
    .map((e) => settlementOf(e, unusedLeave(e.id)));
  return { id: `run-${monthKey(year, month)}`, year, month,
    status: "awaiting-approval", payslips, totals: totalsOf(payslips),
    settlements, backPay, notComputed: [...RUN_NOT_COMPUTED] };
}
