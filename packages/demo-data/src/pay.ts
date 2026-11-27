/**
 * WP6 Pay: past runs, revisions, corrections, loans, fines, final
 * settlements, pay groups and elements. Money goes through the engine
 * (calculatePayslip, or its steps without pension for nationals).
 */
import {
  addDays,
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  formatIsoDate,
  daysInMonth,
  type Fils,
  type LoanInstalment,
  type OvertimeEntry,
  type Payslip,
  type PayslipInput,
  type TraceLine,
} from "@payroll/engine";
import { SETTLEMENT_DUE_DAYS, workingDaysBetween } from "./calendar";
import { displayDate, type DisplayDate } from "./display";
import type { FakeIdentifier } from "./fake-ids";
import { payslipInput } from "./pay-inputs";
import { employedIn } from "./payroll";
import { payslipWithoutPension } from "./pension";
import { BACK_PAY_RAISE } from "./roster";
import type { DemoCompany, DemoEmployee, PayslipBasis } from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const signed = (f: bigint) => f === 0n ? formatAed(fils(0n))
  : f > 0n ? `+${formatAed(fils(f))}` : formatAed(fils(f));
const nameOf = (c: DemoCompany, id: string) =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;
const monthEnd = (m: number) => formatIsoDate({ y: 2026, m,
  d: daysInMonth(2026, m) });

/** Basic salary revisions (basic only; housing unchanged). */
const REVISIONS = [
  { id: "rev-001", employeeId: "emp-012", effective: "2026-09-01",
    entered: "2026-10-05", delta: BACK_PAY_RAISE,
    reason: "Annual review, entered late" },
  { id: "rev-002", employeeId: "emp-024", effective: "2026-07-01",
    entered: "2026-06-25", delta: fils(150000n),
    reason: "Promotion to compliance officer" },
];

/** A closed staff loan, repaid June to August (fictional). */
const OLD_LOAN = { ref: "LN-1880", employeeId: "emp-016",
  principal: fils(450000n), instalment: fils(150000n), months: [6, 7, 8] };

/** What July's payslip wrongly had (corrected in COR-001). */
const WRONG_UNPAID = { employeeId: "emp-020",
  dates: ["2026-07-15", "2026-07-16"] };
/** September overtime that was not paid (COR-002). */
const MISSED_OT = { employeeId: "emp-018",
  entry: { date: "2026-09-17", minutes: 180, nightMinutes: 0 } };

export interface Overtime { date: string; minutes: number;
  nightMinutes: number }

/**
 * Overtime worked before October (the one place for it: pastRuns and
 * payrollHistory both read it).
 */
export const HISTORY_OVERTIME: Record<string, Overtime[]> = {
  "emp-017": [
    { date: "2026-03-10", minutes: 90, nightMinutes: 0 },
    { date: "2026-06-16", minutes: 120, nightMinutes: 0 },
    { date: "2026-08-11", minutes: 60, nightMinutes: 0 }],
  "emp-030": [{ date: "2026-07-14", minutes: 60, nightMinutes: 60 }],
};

/**
 * Paid sick days before October, [employee, first day, last day].
 * They go through the engine too; sick pay is full pay here, so gross
 * does not move. None overlaps an approved request in the leave data.
 */
export const HISTORY_SICK: readonly [string, string, string][] = [
  ["emp-007", "2026-02-17", "2026-02-18"],
  ["emp-020", "2026-05-12", "2026-05-12"],
  ["emp-025", "2026-06-23", "2026-06-24"],
  ["emp-006", "2026-08-04", "2026-08-04"],
];

/** The basic actually paid in a month (revisions apply once entered). */
function paidBasic(e: DemoEmployee, m: number): Fils {
  const end = monthEnd(m);
  const later = REVISIONS.filter((r) => r.employeeId === e.id &&
    (r.effective > end || r.entered > end));
  return fils(e.basicMonthly - later.reduce((n, r) => n + r.delta, 0n));
}

function oldLoan(e: DemoEmployee, m: number): LoanInstalment[] {
  const i = OLD_LOAN.months.indexOf(m);
  if (e.id !== OLD_LOAN.employeeId || i < 0) return [];
  return [{ ref: OLD_LOAN.ref, instalment: OLD_LOAN.instalment,
    balance: fils(OLD_LOAN.principal - OLD_LOAN.instalment * BigInt(i)),
    consentOnFile: true }];
}

/**
 * A month before October as it was paid: revisions once entered,
 * history overtime and sick days, the July recording error, the old
 * loan; LN-2041 starts in October, so not before. The one input both
 * pastRuns and payrollHistory use.
 */
export function pastPayslipInput(e: DemoEmployee, m: number)
  : PayslipInput {
  const key = `2026-${String(m).padStart(2, "0")}`;
  const base = payslipInput(e, { year: 2026, month: m,
    basic: paidBasic(e, m) });
  const wrong = e.id === WRONG_UNPAID.employeeId && m === 7
    ? WRONG_UNPAID.dates.map((date) => ({ date, kind: "unpaid" as const }))
    : [];
  const sick = HISTORY_SICK.filter(([id]) => id === e.id)
    .flatMap(([, from, to]) => workingDaysBetween(from, to))
    .filter((d) => d.startsWith(key))
    .map((date) => ({ date, kind: "sick" as const }));
  return { ...base, absences: [...base.absences, ...wrong, ...sick],
    overtime: [...base.overtime, ...(HISTORY_OVERTIME[e.id] ?? [])
      .filter((o) => o.date.startsWith(key))], loans: oldLoan(e, m) };
}

export interface PastPayslip { id: string; employeeId: string;
  basis: PayslipBasis; input: PayslipInput; payslip: Payslip;
  trace: TraceLine[] }

function compute(e: DemoEmployee, input: PayslipInput, id: string)
  : PastPayslip {
  const national = e.workerClass === "uae-national";
  const r = national ? payslipWithoutPension(input)
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS);
  return { id, employeeId: e.id, basis: national
    ? "engine-steps-without-pension" : "calculatePayslip", input,
  payslip: r.value, trace: r.trace };
}

export interface MonthTotals { payslips: number; gross: Fils;
  deductions: Fils; net: Fils }

export interface PastRun { id: string; year: 2026; month: number;
  status: "paid"; paidOn: DisplayDate; payslips: PastPayslip[];
  totals: MonthTotals;
  display: { month: string; gross: string; net: string } }

const totals = (ps: { payslip: Payslip }[]): MonthTotals => ({
  payslips: ps.length,
  gross: fils(ps.reduce((n, s) => n + s.payslip.gross, 0n)),
  deductions: fils(ps.reduce((n, s) => n + s.payslip.totalDeductions, 0n)),
  net: fils(ps.reduce((n, s) => n + s.payslip.net, 0n)) });

const SLIPS = new WeakMap<DemoCompany, Map<number, PastPayslip[]>>();

/** One month before October (1 to 9), every payslip from the engine. */
export function pastMonthSlips(c: DemoCompany, m: number): PastPayslip[] {
  const byMonth = SLIPS.get(c) ?? new Map<number, PastPayslip[]>();
  SLIPS.set(c, byMonth);
  const hit = byMonth.get(m);
  if (hit !== undefined) return hit;
  const ps = c.employees.filter((e) => employedIn(e, 2026, m))
    .map((e) => compute(e, pastPayslipInput(e, m),
      `ps-2026-${String(m).padStart(2, "0")}-${e.id}`));
  byMonth.set(m, ps);
  return ps;
}

const CACHE = new WeakMap<DemoCompany, PastRun[]>();

/** June to September 2026, as paid (the engine, month by month). */
export function pastRuns(c: DemoCompany): PastRun[] {
  const hit = CACHE.get(c);
  if (hit !== undefined) return hit;
  const runs = [6, 7, 8, 9].map((m): PastRun => {
    const ps = pastMonthSlips(c, m);
    const t = totals(ps);
    const paid = addDays(monthEnd(m), -1);
    return { id: `run-2026-${String(m).padStart(2, "0")}`, year: 2026,
      month: m, status: "paid", paidOn: { iso: paid,
        display: displayDate(paid) }, payslips: ps, totals: t,
      display: { month: `${MONTHS[m - 1]} 2026`, gross: formatAed(t.gross),
        net: formatAed(t.net) } };
  });
  CACHE.set(c, runs);
  return runs;
}

export interface TrendPoint extends MonthTotals { month: number;
  label: string; netDisplay: string; changeDisplay: string }

/** Net pay month on month, June to October. */
export function payTrend(c: DemoCompany): TrendPoint[] {
  const months = [...pastRuns(c).map((r) => ({ month: r.month,
    t: r.totals })), { month: 10, t: totals(c.payRun.payslips) }];
  return months.map((x, i) => ({ ...x.t, month: x.month,
    label: MONTHS[x.month - 1]!, netDisplay: formatAed(x.t.net),
    changeDisplay: i === 0 ? ""
      : signed(x.t.net - months[i - 1]!.t.net) }));
}

export interface RunChange { employeeId: string; change: bigint;
  reasons: string[]; display: { name: string; change: string } }

interface Slip { payslip: Payslip; input: PayslipInput }

function reasonsOf(e: DemoEmployee, p: Slip | undefined, q: Slip,
  month: number): string[] {
  const has = (k: string) => q.payslip.earnings.some((l) => l.kind === k);
  const absent = (k: string) => q.input.absences.some((a) => a.kind === k);
  const loan = (s?: Slip) => s?.payslip.deductions.filter((d) =>
    d.kind === "loan").reduce((n, d) => n + d.amount, 0n) ?? 0n;
  const basic = (s: Slip) => s.input.employee.basicMonthly;
  return [...(p === undefined ? ["joined"] : []),
    ...(e.leavingDate?.startsWith(`2026-${String(month).padStart(2, "0")}`)
      ? ["left"] : []),
    ...(p !== undefined && basic(p) !== basic(q) ? ["basic revised"] : []),
    ...(q.payslip.earnings.some((l) =>
      l.traceId === "earn.allowance#back-pay") ? ["back pay"] : []),
    ...(has("overtime") ? ["overtime"] : []),
    ...(absent("unpaid") ? ["unpaid leave"] : []),
    ...(absent("sick") && q.payslip.unpaidDays > 0
      ? ["sick day unpaid"] : []),
    ...(loan(p) !== loan(q) ? ["loan deduction"] : [])];
}

/** Who changed against the month before, and why (October included). */
export function runChanges(c: DemoCompany, month: number): RunChange[] {
  const runs = pastRuns(c);
  const prev = runs.find((r) => r.month === month - 1);
  const cur = month === 10 ? c.payRun.payslips
    : runs.find((r) => r.month === month)?.payslips ?? [];
  if (prev === undefined) return [];
  return cur.flatMap((s) => {
    const p = prev.payslips.find((x) => x.employeeId === s.employeeId);
    const change = s.payslip.net - (p?.payslip.net ?? 0n);
    if (change === 0n && p !== undefined) return [];
    const e = c.employees.find((x) => x.id === s.employeeId)!;
    const r = reasonsOf(e, p, s, month);
    return [{ employeeId: e.id, change, reasons: r.length > 0 ? r
      : ["other"], display: { name: e.fullName, change: signed(change) } }];
  });
}

export interface SalaryRevision { id: string; employeeId: string;
  fromBasic: Fils; toBasic: Fils; reason: string; arrears: Fils;
  display: { name: string; effective: string; entered: string;
    from: string; to: string; arrears: string; note: string } }

/** Revisions on basic; late ones carry arrears from the engine. */
export function salaryRevisions(c: DemoCompany): SalaryRevision[] {
  return REVISIONS.map((r) => {
    const e = c.employees.find((x) => x.id === r.employeeId)!;
    const arrears = c.payRun.backPay.find((b) =>
      b.employeeId === r.employeeId && r.entered > monthEnd(9))
      ?.amount ?? fils(0n);
    const from = fils(e.basicMonthly - r.delta);
    return { id: r.id, employeeId: e.id, fromBasic: from,
      toBasic: e.basicMonthly, reason: r.reason, arrears,
      display: { name: e.fullName, effective: displayDate(r.effective),
        entered: displayDate(r.entered), from: formatAed(from),
        to: formatAed(e.basicMonthly), arrears: formatAed(arrears),
        note: "Basic salary only; housing unchanged." } };
  });
}

export interface LedgerRow { month: number; taken: Fils; balance: Fils }
export interface LoanRecord { ref: string; employeeId: string;
  kind: "loan" | "advance"; status: "active" | "closed" | "approved";
  principal: Fils; instalment: Fils; balance: Fils; ledger: LedgerRow[];
  display: { name: string; principal: string; instalment: string;
    balance: string; firstDeduction: string; note: string } }

const loanLedger = (ps: { month: number; s?: PastPayslip | undefined;
  q?: Payslip }[], ref: string): LedgerRow[] => ps.flatMap((x) => {
  const p = x.q ?? x.s?.payslip;
  const b = p?.loanBalances.find((l) => l.ref === ref);
  const d = p?.deductions.find((l) => l.traceId.endsWith(`#${ref}`));
  return b === undefined ? [] : [{ month: x.month,
    taken: d?.amount ?? fils(0n), balance: b.after }];
});

function loanRow(c: DemoCompany, o: Omit<LoanRecord, "display">,
  first: string, note: string): LoanRecord {
  return { ...o, display: { name: nameOf(c, o.employeeId),
    principal: formatAed(o.principal), instalment: formatAed(o.instalment),
    balance: formatAed(o.balance), firstDeduction: first, note } };
}

/** Loans and advances; balances come from the engine's payslips. */
export function loans(c: DemoCompany): LoanRecord[] {
  const runs = pastRuns(c);
  const old = loanLedger(runs.map((r) => ({ month: r.month,
    s: r.payslips.find((s) => s.employeeId === OLD_LOAN.employeeId) })),
  OLD_LOAN.ref);
  const cur = c.payRun.payslips.find((s) =>
    s.payslip.loanBalances.some((l) => l.ref === "LN-2041"))!;
  const now = loanLedger([{ month: 10, q: cur.payslip }], "LN-2041");
  return [
    loanRow(c, { ref: "LN-2041", employeeId: cur.employeeId, kind: "loan",
      status: "active", principal: cur.input.loans[0]!.balance,
      instalment: cur.input.loans[0]!.instalment,
      balance: now[0]!.balance, ledger: now }, "October",
    "The October instalment was reduced by the deduction limit."),
    loanRow(c, { ref: OLD_LOAN.ref, employeeId: OLD_LOAN.employeeId,
      kind: "loan", status: "closed", principal: OLD_LOAN.principal,
      instalment: OLD_LOAN.instalment, balance: old.at(-1)!.balance,
      ledger: old }, "June", "Repaid in full in August."),
    loanRow(c, { ref: "ADV-1007", employeeId: "emp-018", kind: "advance",
      status: "approved", principal: fils(300000n),
      instalment: fils(100000n), balance: fils(300000n), ledger: [] },
    "November", "Salary advance signed off on 26 October; recovered in " +
      "three instalments, each checked against the limits on the day."),
  ];
}

export interface PayCorrection { id: string; employeeId: string;
  month: number; reason: string; paidNet: Fils; correctNet: Fils;
  amount: Fils; status: "pending"; payIn: "November";
  display: { name: string; month: string; amount: string } }

function correction(c: DemoCompany, id: string, employeeId: string,
  month: number, reason: string,
  fix: (i: PayslipInput) => PayslipInput): PayCorrection {
  const e = c.employees.find((x) => x.id === employeeId)!;
  const paid = pastRuns(c).find((r) => r.month === month)!.payslips
    .find((s) => s.employeeId === employeeId)!;
  const right = compute(e, fix(paid.input), `${id}-correct`);
  const amount = fils(right.payslip.net - paid.payslip.net);
  return { id, employeeId, month, reason, paidNet: paid.payslip.net,
    correctNet: right.payslip.net, amount, status: "pending",
    payIn: "November", display: { name: e.fullName,
      month: `${MONTHS[month - 1]} 2026`, amount: formatAed(amount) } };
}

/** Corrections to paid months: the engine's difference, to pay. */
export function payCorrections(c: DemoCompany): PayCorrection[] {
  const ot: OvertimeEntry = MISSED_OT.entry;
  return [
    correction(c, "cor-001", WRONG_UNPAID.employeeId, 7, "Two days in " +
      "July were recorded as unpaid leave in error; the employee was at " +
      "work.", (i) => ({ ...i, absences: i.absences.filter((a) =>
      !WRONG_UNPAID.dates.includes(a.date)) })),
    correction(c, "cor-002", MISSED_OT.employeeId, 9, "Three hours of " +
      "overtime on 17 September were agreed but not paid.",
    (i) => ({ ...i, overtime: [...i.overtime, ot] })),
  ];
}

export interface TrafficFine { id: string; employeeId: string;
  date: string; amount: Fils; offence: string; number: FakeIdentifier;
  status: "to-decide"; options: string[]; recoveryNote: string;
  display: { name: string; date: string; amount: string } }

const FINE = (n: number): FakeIdentifier => ({
  value: `DEMO-TF-26-${String(n).padStart(4, "0")}`,
  masked: `DEMO-TF-26-****`, fake: true,
  note: "Fake: DEMO prefix, not an issued fine" });

/** Fines on company cars, waiting for a decision (fictional records). */
export function trafficFines(c: DemoCompany): TrafficFine[] {
  const note = "Recovering a fine from pay is not computed: there " +
    "is no sourced rule for it, and any deduction would be checked " +
    "against the deduction limits.";
  return [["emp-013", "2026-10-09", 60000n, "Speeding, company car"],
    ["emp-017", "2026-10-18", 40000n, "Parking, company car"]].map(
    ([id, date, amount, offence], i): TrafficFine => ({
      id: `tf-${i + 1}`, employeeId: id as string, date: date as string,
      amount: fils(amount as bigint), offence: offence as string,
      number: FINE(i + 1), status: "to-decide",
      options: ["The company pays", "Recover from the employee"],
      recoveryNote: note, display: { name: nameOf(c, id as string),
        date: displayDate(date as string),
        amount: formatAed(fils(amount as bigint)) } }));
}

export interface FinalSettlement { employeeId: string; lastDay: string;
  gratuity: Fils; leavePay: Fils; total: Fils; notComputed: string[];
  status: string; display: { name: string; lastDay: string;
    due: string; unusedLeave: string; gratuity: string;
    leavePay: string; total: string } }

/** The final settlements list (gratuity from calculateSettlement). */
export function finalSettlements(c: DemoCompany): FinalSettlement[] {
  return c.payRun.settlements.map((s) => {
    const e = c.employees.find((x) => x.id === s.employeeId)!;
    const r = s.result;
    return { employeeId: e.id, lastDay: e.leavingDate!,
      gratuity: r.gratuity, leavePay: r.leavePay, total: r.total,
      notComputed: [...r.notComputed],
      status: "Computed; notice pay and deductions to add",
      display: { name: e.fullName, lastDay: displayDate(e.leavingDate!),
        due: displayDate(addDays(e.leavingDate!, SETTLEMENT_DUE_DAYS)),
        unusedLeave: `${s.unusedLeaveDays.toFixed(2)} days`,
        gratuity: formatAed(r.gratuity), leavePay: formatAed(r.leavePay),
        total: formatAed(r.total) } };
  });
}

export interface PayGroup { id: string; label: string;
  employeeIds: string[]; payday: string }

/** Read-only: who is paid together (head office, the branches). */
export function payGroups(c: DemoCompany): PayGroup[] {
  const ids = (hq: boolean) => c.payRun.payslips.map((s) =>
    s.employeeId).filter((id) => (c.employees.find((e) => e.id === id)!
    .location === "hq-abu-dhabi") === hq);
  return [{ id: "pg-hq", label: "Head office, monthly",
    employeeIds: ids(true), payday: "Last working day" },
  { id: "pg-branches", label: "Branches, monthly",
    employeeIds: ids(false), payday: "Last working day" }];
}

export interface PayElement { code: string; label: string;
  type: "earning" | "deduction"; howSet: string; salaryFile: string }

const el = (code: string, label: string, type: PayElement["type"],
  howSet: string, salaryFile: string): PayElement =>
  ({ code, label, type, howSet, salaryFile });

/** Read-only reference: what can appear on a payslip, and how. */
export function payElements(): PayElement[] {
  return [
    el("basic", "Basic salary", "earning", "Contract, prorated by the " +
      "payroll", "Fixed pay"),
    el("housing", "Housing allowance", "earning", "Contract", "Housing"),
    el("transport", "Transport allowance", "earning", "Contract",
      "Conveyance"),
    el("phone", "Phone allowance", "earning", "Contract", "Other"),
    el("back-pay", "Back pay on basic salary", "earning", "Owed minus " +
      "paid, from two runs", "Other"),
    el("overtime", "Overtime", "earning", "Computed by the payroll from " +
      "agreed hours", "Overtime"),
    el("loan", "Loan instalment", "deduction", "Entered; limited by the " +
      "deduction limits", "Taken from pay before the file"),
    el("traffic-fine", "Traffic fine recovery", "deduction", "Not " +
      "computed", "Not in the file"),
  ];
}
