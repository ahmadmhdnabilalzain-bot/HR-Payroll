import {
  buildDemoCompany,
  demoLabel,
  departmentText,
  displayDate,
  finalSettlements,
  isDemoLabelKey,
  loans,
  payCalendar,
  payCorrections,
  payElements,
  payGroups,
  pastRuns,
  payTrend,
  plural,
  runChanges,
  salaryRevisions,
  SETTLEMENT_DUE_DAYS,
  trafficFines,
  type DemoCompany,
} from "@payroll/demo-data";
import { fils, type Fils } from "@payroll/engine";
import { money, text, type Explanation } from "../../components/explain";
import { people, sumExplain } from "../../components/explain/sum";
import type {
  CorrectionView,
  PastRunView,
  PayView,
  RunSlip,
} from "../../pay/types";

/**
 * WP6's half of the demo data (navigation map, section 7): the pay
 * package's selectors (packages/demo-data/src/pay.ts) turned into
 * plain view records. Loaded lazily (pay/load.ts), built once from the
 * company as built: none of these records depends on the IBANs typed.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const monthName = (m: number): string => MONTHS[m - 1] ?? "";
const keyOf = (m: number): string => `2026-${String(m).padStart(2, "0")}`;

/**
 * The package's wording, where it would put a banned word on screen
 * ("approved" is a claim the demo never makes; tests/unit/demo-copy).
 */
const REWORD: [RegExp, string][] = [
  [/were approved but not paid/, "were signed off but not paid"],
  [/advance approved on/, "advance agreed on"],
  [/from approved hours/, "from hours signed off"],
];
export function reword(s: string): string {
  return REWORD.reduce((x, [re, to]) => x.replace(re, to), s);
}

const nameOf = (c: DemoCompany, id: string): string =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

function correctionExplain(c: DemoCompany, x: ReturnType<
  typeof payCorrections>[number]): Explanation {
  const month = `${monthName(x.month)} 2026`;
  return { id: `correction:${x.id}`, title: "Pay correction",
    subject: x.display.name,
    summary: `${month} is worked out again by the payroll with the ` +
      "record put right; the difference is owed and paid in " +
      `${x.payIn}.`,
    result: { label: "Owed", value: money(x.amount) },
    inputs: [
      { label: "Month", value: text(month), from: `${month} payroll` },
      { label: "What was wrong", value: text(reword(x.reason)),
        from: "HR record" },
    ],
    rules: [],
    steps: [
      { text: `Net pay as paid in ${month}`, value: money(x.paidNet) },
      { text: "Net pay worked out again, record put right",
        value: money(x.correctNet) },
      { text: `Difference, to pay in ${x.payIn}`, value: money(x.amount) },
    ],
    notComputed: [], scope: c.rulesScope };
}

function runExplain(c: DemoCompany, id: string, label: string,
  slips: RunSlip[], gross: Fils, deductions: Fils, net: Fils)
  : Explanation {
  return { id: `past-run:${id}`, title: `Net pay, ${label}`,
    subject: "Whole pay run",
    summary: `The sum of ${slips.length} payslips, each worked out by ` +
      "the payroll line by line, exactly.",
    result: { label: "Net pay", value: money(net) },
    inputs: [{ label: "Payslips", value: text(String(slips.length)),
      from: `${label} payroll` }],
    rules: [],
    steps: [
      { text: `Gross pay of ${plural(slips.length, "person", "people")}`,
        value: money(gross), op: "add" },
      { text: "Less deductions", value: money(deductions), op: "less" },
      { text: "Net pay", value: money(net), op: "total" },
    ],
    notComputed: [], scope: c.rulesScope };
}

/** A month's gross, department by department. */
function grossExplain(c: DemoCompany, id: string, label: string,
  slips: RunSlip[]): Explanation {
  const dept = new Map(c.employees.map((e) => [e.id, e.departmentId]));
  return sumExplain({ id: `past-run-gross:${id}`,
    title: `Gross pay, ${label}`, subject: "Whole pay run",
    summary: "Every payslip's gross pay, added up by department.",
    resultLabel: "Gross pay", parts: c.departments.map((d) => slips
      .filter((x) => dept.get(x.employeeId) === d.id))
      .filter((xs) => xs.length > 0).map((xs) => ({
        text: `${departmentText(dept.get(xs[0]!.employeeId)!)} ` +
          `(${people(xs.length)})`,
        value: money(fils(xs.reduce((n, x) => n + x.gross, 0n))) })),
    scope: c.rulesScope });
}

/** Net against the month before: this month less last month. */
function changeExplain(c: DemoCompany, id: string, label: string,
  prevLabel: string, net: Fils, prev: Fils): Explanation {
  return sumExplain({ id: `past-run-change:${id}`,
    title: "Net pay against the month before", subject: label,
    summary: "This month's net pay less the month before's. Open Who " +
      "changed to see each person's part.", resultLabel: "Change",
    parts: [{ text: `Net pay, ${label}`, value: money(net) },
      { text: `Less net pay, ${prevLabel}`, value: money(prev),
        less: true }], totalText: "Change", scope: c.rulesScope });
}

function runsOf(c: DemoCompany): PastRunView[] {
  const trend = payTrend(c);
  const cal = payCalendar(c);
  const past = pastRuns(c);
  return trend.map((t, i) => {
    const run = past.find((r) => r.month === t.month);
    const src = run?.payslips ?? c.payRun.payslips;
    const slips: RunSlip[] = src.map((s) => ({ employeeId: s.employeeId,
      name: nameOf(c, s.employeeId), gross: s.payslip.gross,
      deductions: s.payslip.totalDeductions, net: s.payslip.net }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const label = `${t.label} 2026`;
    const id = keyOf(t.month);
    const before = trend[i - 1];
    return { id, key: id, label,
      paidOn: run === undefined ? displayDate(cal.payday)
        : run.paidOn.display,
      paid: run !== undefined, headcount: t.payslips, gross: t.gross,
      deductions: t.deductions, net: t.net,
      change: before === undefined ? null : t.net - before.net, slips,
      changes: runChanges(c, t.month).map((x) => ({
        employeeId: x.employeeId, name: x.display.name, change: x.change,
        reasons: x.reasons })),
      explanation: runExplain(c, id, label, slips, t.gross, t.deductions,
        t.net), grossExplanation: grossExplain(c, id, label, slips),
      changeExplanation: before === undefined ? null : changeExplain(c, id,
        label, `${before.label} 2026`, t.net, before.net) };
  });
}

/** Every deduction line in the runs, newest month first. */
function deductionsOf(c: DemoCompany): PayView["deductions"] {
  const months = [...pastRuns(c).map((r) => ({ m: r.month,
    slips: r.payslips })), { m: 10, slips: c.payRun.payslips }];
  return months.reverse().flatMap(({ m, slips }) => slips.flatMap((s) =>
    s.payslip.deductions.map((d, i) => ({
      id: `${keyOf(m)}-${s.employeeId}-${i}`,
      month: `${monthName(m)} 2026`, employeeId: s.employeeId,
      name: nameOf(c, s.employeeId), label: d.label, amount: d.amount,
      ref: d.kind === "loan" ? d.traceId.split("#")[1] ?? null : null }))));
}

function dueExplain(c: DemoCompany, s: ReturnType<
  typeof finalSettlements>[number]): Explanation {
  return { id: `settlement-due:${s.employeeId}`,
    title: "Settlement due date", subject: s.display.name,
    summary: `The settlement is due ${SETTLEMENT_DUE_DAYS} days after ` +
      "the last working day, as we read the law.",
    result: { label: "Pay by", value: text(s.display.due) },
    inputs: [{ label: "Last working day", value: text(s.display.lastDay),
      from: "Employee record" }],
    rules: [{ text: `A final settlement is paid within ` +
      `${SETTLEMENT_DUE_DAYS} days after the last working day.`,
    status: "official", statusLabel: null,
    citation: "Decree-Law 33/2021, Article 53" }],
    steps: [
      { text: "Last working day", value: text(s.display.lastDay) },
      { text: `Add ${SETTLEMENT_DUE_DAYS} days`,
        value: text(s.display.due) },
    ],
    notComputed: [], scope: c.rulesScope };
}

/** Every WP6 record, as the screens show it. */
export function payViewOf(c: DemoCompany): PayView {
  const loanCut = c.employees.find((e) => e.cases.includes("loan-over-cap"));
  const corrections: CorrectionView[] = payCorrections(c).map((x) => ({
    id: x.id, employeeId: x.employeeId, name: x.display.name,
    month: `${monthName(x.month)} 2026`, reason: reword(x.reason),
    paidNet: x.paidNet, correctNet: x.correctNet, amount: x.amount,
    payIn: x.payIn, explanation: correctionExplain(c, x) }));
  return {
    expenses: c.expenses.map((x) => ({ id: x.id, employeeId: x.employeeId,
      // Provenance stays out of the body copy (the sources line).
      name: nameOf(c, x.employeeId), title: (isDemoLabelKey(x.titleKey)
        ? demoLabel(x.titleKey, "en") : x.titleKey),
      date: displayDate(x.date), amount: x.amount, vat: x.vat,
      receipt: x.receipt, settled: x.status !== "pending" })),
    deductions: deductionsOf(c),
    loans: loans(c).map((l) => ({ ref: l.ref, employeeId: l.employeeId,
      name: l.display.name, kind: l.kind,
      status: l.status === "approved" ? "starts" : l.status,
      principal: l.principal, instalment: l.instalment,
      balance: l.balance, firstDeduction: l.display.firstDeduction,
      note: reword(l.display.note),
      ledger: l.ledger.map((r) => ({ month: `${monthName(r.month)} 2026`,
        taken: r.taken, balance: r.balance })),
      explainId: l.employeeId === loanCut?.id ? `loan:${l.employeeId}`
        : null })),
    revisions: salaryRevisions(c).map((r) => ({ id: r.id,
      employeeId: r.employeeId, name: r.display.name, from: r.fromBasic,
      to: r.toBasic, effective: r.display.effective,
      entered: r.display.entered, reason: reword(r.reason),
      arrears: r.arrears, note: r.display.note,
      explainId: `person:${r.employeeId}` })),
    corrections,
    fines: trafficFines(c).map((f) => ({ id: f.id,
      employeeId: f.employeeId, name: f.display.name, date: f.display.date,
      amount: f.amount, offence: f.offence, number: f.number.masked,
      numberNote: f.number.note, recoveryNote: f.recoveryNote })),
    settlements: finalSettlements(c).map((s) => ({
      employeeId: s.employeeId, name: s.display.name,
      lastDay: s.display.lastDay, due: s.display.due,
      unusedLeave: s.display.unusedLeave, gratuity: s.gratuity,
      leavePay: s.leavePay, total: s.total, notComputed: s.notComputed,
      explainId: `gratuity:${s.employeeId}`,
      dueExplanation: dueExplain(c, s) })),
    runs: runsOf(c),
    groups: payGroups(c).map((g) => ({ id: g.id, label: g.label,
      names: g.employeeIds.map((id) => nameOf(c, id)).sort(),
      payday: g.payday })),
    elements: payElements().map((e) => ({ ...e, howSet: reword(e.howSet) })),
    people: c.payRun.payslips.map((s) => {
      const e = c.employees.find((x) => x.id === s.employeeId)!;
      return { id: e.id, name: e.fullName, basic: e.basicMonthly };
    }).sort((a, b) => a.name.localeCompare(b.name)),
    scope: c.rulesScope,
    thisRun: `${monthName(c.payRun.month)} ${c.payRun.year}`,
    nextRun: `${monthName(c.payRun.month + 1)} ${c.payRun.year}`,
    firstMonths: [1, 2].map((n) =>
      `${monthName(c.payRun.month + n)} ${c.payRun.year}`),
  };
}

export function buildPayView(): PayView {
  return payViewOf(buildDemoCompany());
}
