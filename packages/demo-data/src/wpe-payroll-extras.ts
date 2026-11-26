import {
  calculatePayslip,
  daysBetween,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  type Fils,
  type Payslip,
  type PayslipInput,
} from "@payroll/engine";
import { AS_OF, isWorkingDay, workingDaysBetween } from "./calendar";
import { displayDate, duration } from "./display";
import { demoLabel, isDemoLabelKey } from "./labels";
import { pastRuns, payElements } from "./pay";
import { payslipWithoutPension } from "./pension";
import { BACK_PAY_RAISE } from "./roster";
import { BASIC_STEP, GRADE_BASIC } from "./roster-data";
import type { DemoCompany, DemoEmployee, DemoPayslip } from "./types";
import { placeText } from "./wp3";
import { auditEvents, payrollHistory, reportDate, reportMonth } from "./wp7";

/**
 * WPE payroll extras (wave 3, WP16). FICTIONAL. Every amount comes
 * from the engine: the October payslips as run, September as paid
 * (pastRuns), or a fresh engine run of a payslip's own input with one
 * thing changed. Nothing here is saved, posted or sent. Unlocks map
 * rows X06, X08, X30, X32, S38, S08, R09, R15 (R12 and R14 read the
 * salary file as the pay run builds it).
 */

const sum = (xs: readonly bigint[]): Fils =>
  fils(xs.reduce((n, x) => n + x, 0n));

const signed = (f: bigint): string => f === 0n ? "No change"
  : `${f > 0n ? "+" : "−"}${formatAed(fils(f < 0n ? -f : f))}`;

const deptText = (c: DemoCompany, e: DemoEmployee): string => {
  const d = c.departments.find((x) => x.id === e.departmentId);
  return d !== undefined && isDemoLabelKey(d.labelKey)
    ? demoLabel(d.labelKey, "en") : "";
};

const empOf = (c: DemoCompany, id: string): DemoEmployee =>
  c.employees.find((e) => e.id === id)!;

/* ---------------------------------------------------------------- *
 * Pay elements: which payslip line is which element
 * ---------------------------------------------------------------- */

type Line = Payslip["earnings"][number] | Payslip["deductions"][number];

/** The element code of a payslip line (payElements' own codes). */
export function elementOf(l: Line): string {
  switch (l.kind) {
    case "basic": return "basic";
    case "housing": return "housing";
    case "conveyance": return "transport";
    case "overtime": case "rest-day": case "holiday": return "overtime";
    case "loan": return "loan";
    default: {
      const code = l.label.replace(/^Allowance /, "");
      return payElements().some((e) => e.code === code) ? code : "other";
    }
  }
}

const ELEMENT_ORDER = (): string[] => payElements().map((e) => e.code);

export interface ElementRow {
  code: string;
  label: string;
  type: "earning" | "deduction";
  october: Fils;
  september: Fils;
  change: Fils;
  /** People with this element in October. */
  people: number;
  computed: boolean;
  display: { october: string; september: string; change: string;
    people: string };
}

export interface ElementReport {
  period: string;
  rows: ElementRow[];
  earningsOctober: Fils;
  earningsSeptember: Fils;
  note: string;
}

function linesOf(slips: readonly Pick<DemoPayslip, "payslip">[])
  : { code: string; amount: bigint; type: "earning" | "deduction" }[] {
  return slips.flatMap((s) => [
    ...s.payslip.earnings.map((l) => ({ code: elementOf(l),
      amount: l.amount, type: "earning" as const })),
    ...s.payslip.deductions.map((l) => ({ code: elementOf(l),
      amount: l.amount, type: "deduction" as const }))]);
}

/** X06: October by pay element against September, both engine runs. */
export function elementReport(c: DemoCompany): ElementReport {
  const sept = pastRuns(c).find((r) => r.month === 9)?.payslips ?? [];
  const now = linesOf(c.payRun.payslips);
  const before = linesOf(sept);
  const rows = payElements().map((el): ElementRow => {
    const o = sum(now.filter((l) => l.code === el.code).map((l) =>
      l.amount));
    const s = sum(before.filter((l) => l.code === el.code).map((l) =>
      l.amount));
    const people = c.payRun.payslips.filter((p) => linesOf([p])
      .some((l) => l.code === el.code && l.amount !== 0n)).length;
    const computed = el.code !== "traffic-fine";
    return { code: el.code, label: el.label, type: el.type, october: o,
      september: s, change: fils(o - s), people, computed,
      display: computed ? { october: formatAed(o), september: formatAed(s),
        change: signed(o - s), people: people === 0 ? "None"
          : `${people} ${people === 1 ? "person" : "people"}` }
        : { october: "Not computed", september: "Not computed",
          change: "Not computed", people: "Not computed" } };
  });
  return { period: "October 2026 against September 2026", rows,
    earningsOctober: sum(now.filter((l) => l.type === "earning")
      .map((l) => l.amount)),
    earningsSeptember: sum(before.filter((l) => l.type === "earning")
      .map((l) => l.amount)),
    note: "Each line of every payslip is put under its pay element. " +
      "Earnings add up to gross pay for each month. Traffic fine " +
      "recovery is not computed." };
}

/* ---------------------------------------------------------------- *
 * Payroll journal: a view for the finance team
 * ---------------------------------------------------------------- */

export interface JournalLine {
  side: "debit" | "credit";
  account: string;
  department: string;
  amount: Fils;
  display: string;
}

export interface PayrollJournal {
  period: string;
  lines: JournalLine[];
  debits: Fils;
  credits: Fils;
  balanced: boolean;
  note: string;
}

/**
 * X08: October's pay as a journal view. Debits: pay elements by
 * department (they add up to gross). Credits: net pay in the salary
 * file, net pay held out of it, and each deduction (they add up to
 * net plus deductions, which is gross). Not an accounting entry.
 */
export function payrollJournal(c: DemoCompany): PayrollJournal {
  const label = new Map(payElements().map((e) => [e.code, e.label]));
  const debit = new Map<string, bigint>();
  for (const s of c.payRun.payslips) {
    const dept = deptText(c, empOf(c, s.employeeId));
    for (const l of s.payslip.earnings) {
      const k = `${elementOf(l)}|${dept}`;
      debit.set(k, (debit.get(k) ?? 0n) + l.amount);
    }
  }
  const order = ELEMENT_ORDER();
  const depts = c.departments.map((d) => isDemoLabelKey(d.labelKey)
    ? demoLabel(d.labelKey, "en") : "");
  const debits = [...debit].filter(([, a]) => a !== 0n)
    .map(([k, a]) => ({ code: k.split("|")[0]!, dept: k.split("|")[1]!,
      a })).sort((x, y) => order.indexOf(x.code) - order.indexOf(y.code) ||
      depts.indexOf(x.dept) - depts.indexOf(y.dept))
    .map((x): JournalLine => ({ side: "debit", account:
      `Salary cost: ${label.get(x.code) ?? "Other earnings"}`,
    department: x.dept, amount: fils(x.a), display: formatAed(fils(x.a)) }));
  const inFile = sum(c.payRun.payslips.filter((s) => s.sif.included)
    .map((s) => s.payslip.net));
  const held = sum(c.payRun.payslips.filter((s) => !s.sif.included)
    .map((s) => s.payslip.net));
  const ded = new Map<string, bigint>();
  for (const s of c.payRun.payslips) {
    for (const l of s.payslip.deductions) {
      const k = elementOf(l);
      ded.set(k, (ded.get(k) ?? 0n) + l.amount);
    }
  }
  const credit = (account: string, a: bigint): JournalLine => ({
    side: "credit", account, department: "Whole company", amount: fils(a),
    display: formatAed(fils(a)) });
  const credits = [credit("Net pay to the salary file", inFile),
    ...(held === 0n ? [] : [credit("Net pay held out of the salary file",
      held)]),
    ...[...ded].filter(([, a]) => a !== 0n).map(([k, a]) => credit(
      `Taken from pay: ${label.get(k) ?? "Other deductions"}`, a))];
  const lines = [...debits, ...credits];
  const dr = sum(debits.map((l) => l.amount));
  const cr = sum(credits.map((l) => l.amount));
  return { period: "October 2026", lines, debits: dr, credits: cr,
    balanced: dr === cr,
    note: "A view of the month's pay for the finance team, worked out " +
      "from the October run totals. It is not an accounting entry: " +
      "nothing is posted, and account codes are for your accountant to " +
      "map. Employer costs are not in it." };
}

/* ---------------------------------------------------------------- *
 * Analysis builder: four datasets, group by, one measure
 * ---------------------------------------------------------------- */

export type MeasureKind = "money" | "count" | "minutes" | "days";

export interface AnalysisDataset {
  id: string;
  label: string;
  /** Where the rows come from, said once. */
  source: string;
  dims: { id: string; label: string }[];
  measures: { id: string; label: string; kind: MeasureKind }[];
  rows: { dims: Record<string, string>; values: Record<string, bigint> }[];
  /** Group labels in their natural order (months, grades). */
  order: Record<string, string[]>;
}

export interface AnalysisResult {
  rows: { label: string; value: bigint; display: string }[];
  total: bigint;
  totalDisplay: string;
}

const MONTHS10 = Array.from({ length: 10 }, (_, i) =>
  reportMonth(`2026-${String(i + 1).padStart(2, "0")}`));

export function measureText(kind: MeasureKind, v: bigint): string {
  switch (kind) {
    case "money": return formatAed(fils(v));
    case "count": return `${v}`;
    case "minutes": return v === 0n ? "None" : duration(Number(v));
    case "days": return `${v} ${v === 1n ? "day" : "days"}`;
  }
}

/** X30: payroll history, headcount, leave and overtime, as rows. */
export function analysisDatasets(c: DemoCompany): AnalysisDataset[] {
  const h = payrollHistory(c);
  const lines = h.flatMap((m) => m.lines.map((l) => ({ m, l,
    e: empOf(c, l.employeeId) })));
  const deptOrder = c.departments.map((d) => isDemoLabelKey(d.labelKey)
    ? demoLabel(d.labelKey, "en") : "");
  const payroll: AnalysisDataset = { id: "payroll",
    label: "Payroll history", source: "Pay runs January to October " +
      "2026, each person's payslip from the payroll",
    dims: [{ id: "month", label: "Month" },
      { id: "department", label: "Department" }],
    measures: [{ id: "gross", label: "Gross pay", kind: "money" },
      { id: "net", label: "Net pay", kind: "money" },
      { id: "payslips", label: "Payslips", kind: "count" }],
    rows: lines.map(({ m, l, e }) => ({ dims: { month:
      reportMonth(m.month), department: deptText(c, e) },
    values: { gross: l.gross, net: l.net, payslips: 1n } })),
    order: { month: MONTHS10, department: deptOrder } };
  const oct = c.payRun.payslips.map((s) => empOf(c, s.employeeId));
  const headcount: AnalysisDataset = { id: "headcount",
    label: "Headcount, October", source: "People on the October pay run",
    dims: [{ id: "department", label: "Department" },
      { id: "branch", label: "Branch" },
      { id: "nationality", label: "UAE national or not" },
      { id: "grade", label: "Grade" }],
    measures: [{ id: "people", label: "People", kind: "count" }],
    rows: oct.map((e) => ({ dims: { department: deptText(c, e),
      branch: placeText(e.location), nationality: e.workerClass ===
        "uae-national" ? "UAE national" : "Not a UAE national",
      grade: `Grade ${e.grade}` }, values: { people: 1n } })),
    order: { department: deptOrder, grade: Array.from({ length: 10 },
      (_, i) => `Grade ${i + 1}`) } };
  const status = { approved: "Booked", pending: "Waiting",
    rejected: "Declined" } as Record<string, string>;
  const leave: AnalysisDataset = { id: "leave", label: "Leave requests",
    source: "Leave requests in 2026, working days counted",
    dims: [{ id: "type", label: "Leave type" },
      { id: "department", label: "Department" },
      { id: "status", label: "Status" }],
    measures: [{ id: "days", label: "Working days", kind: "days" },
      { id: "requests", label: "Requests", kind: "count" }],
    rows: c.leaveRequests.map((r) => {
      const t = c.leaveTypes.find((x) => x.id === r.leaveTypeId);
      return { dims: { type: t !== undefined && isDemoLabelKey(t.labelKey)
        ? demoLabel(t.labelKey, "en") : r.leaveTypeId,
      department: deptText(c, empOf(c, r.employeeId)),
      status: status[r.status] ?? "Waiting" },
      values: { days: BigInt(workingDaysBetween(r.startDate, r.endDate)
        .length), requests: 1n } };
    }),
    order: { department: deptOrder } };
  const overtime: AnalysisDataset = { id: "overtime",
    label: "Overtime", source: "Overtime paid January to October 2026, " +
      "valued by the payroll",
    dims: [{ id: "month", label: "Month" },
      { id: "department", label: "Department" }],
    measures: [{ id: "amount", label: "Overtime pay", kind: "money" },
      { id: "minutes", label: "Hours", kind: "minutes" }],
    rows: lines.filter(({ l }) => l.overtimeMinutes > 0).map(({ m, l,
      e }) => ({ dims: { month: reportMonth(m.month),
      department: deptText(c, e) }, values: { amount: l.overtimeAmount,
      minutes: BigInt(l.overtimeMinutes) } })),
    order: { month: MONTHS10, department: deptOrder } };
  return [payroll, headcount, leave, overtime];
}


/** Group a dataset by one dimension and add up one measure. */
export function analyse(ds: AnalysisDataset, dim: string, measure: string)
  : AnalysisResult {
  const m = ds.measures.find((x) => x.id === measure) ?? ds.measures[0]!;
  const groups = new Map<string, bigint>();
  for (const r of ds.rows) {
    const k = r.dims[dim] ?? "";
    groups.set(k, (groups.get(k) ?? 0n) + (r.values[m.id] ?? 0n));
  }
  const order = ds.order[dim];
  const rows = [...groups].map(([label, value]) => ({ label, value,
    display: measureText(m.kind, value) }))
    .sort((a, b) => order !== undefined
      ? order.indexOf(a.label) - order.indexOf(b.label)
      : a.label.localeCompare(b.label));
  const total = rows.reduce((n, r) => n + r.value, 0n);
  return { rows, total, totalDisplay: measureText(m.kind, total) };
}

/* ---------------------------------------------------------------- *
 * Sign-off report: who signed off what, and when
 * ---------------------------------------------------------------- */

export type SignOffOutcome = "signed-off" | "declined" | "waiting";

export interface SignOffRow {
  id: string;
  /** The inbox item's id when it is still waiting (demo decisions). */
  inboxId: string | null;
  kindText: string;
  subject: string;
  askedBy: string;
  askedOn: string;
  decider: string;
  decidedOn: string;
  outcome: SignOffOutcome;
  outcomeText: string;
  /** "Same day", "1 day", "4 days" between asked and decided. */
  tookText: string;
  /** For sorting: ISO of the latest event. */
  sortKey: string;
}

const KIND: Record<string, string> = { leave: "Leave", expense:
  "Expense claim", "pay-run": "Pay run", employee: "Salary change" };

const whoText = (c: DemoCompany, id: string | null): string =>
  id === null ? "The system" : empOf(c, id).fullName;

const dayGap = (from: string, to: string): string => {
  const d = daysBetween(from.slice(0, 10), to.slice(0, 10));
  return d === 0 ? "Same day" : `${d} ${d === 1 ? "day" : "days"}`;
};

const stamp = (at: string): string =>
  `${reportDate(at.slice(0, 10))}, ${at.slice(11, 16)}`;

/** X32: every sign-off in the audit trail, then what still waits. */
export function signOffReport(c: DemoCompany): SignOffRow[] {
  const ev = auditEvents(c);
  const asks = new Map(ev.filter((e) => /\.(requested|submitted)$/
    .test(e.action)).map((e) => [e.subject.id, e]));
  const done = ev.filter((e) => /\.(signed-off|declined)$/.test(e.action))
    .map((e): SignOffRow => {
      const ask = asks.get(e.subject.id);
      const ok = e.action.endsWith(".signed-off");
      return { id: e.id, inboxId: null,
        kindText: KIND[e.subject.kind] ?? "Other",
        subject: e.subject.label, askedBy: ask === undefined ? "Not asked "
          + "in the system" : whoText(c, ask.actorId),
        askedOn: ask === undefined ? "" : stamp(ask.at),
        decider: whoText(c, e.actorId), decidedOn: stamp(e.at),
        outcome: ok ? "signed-off" : "declined",
        outcomeText: ok ? "Signed off" : "Declined",
        tookText: ask === undefined ? "" : dayGap(ask.at, e.at),
        sortKey: e.at };
    });
  const waiting = c.approvals.map((a): SignOffRow => {
    const ask = asks.get(a.subjectId);
    const subject = ask?.subject.label ?? (a.kind === "pay-run"
      ? `Pay run ${reportMonth(a.subjectId.slice(4))}`
      : `${whoText(c, a.employeeId)}, ${KIND[a.kind] ?? ""}`);
    return { id: a.id, inboxId: a.id, kindText: KIND[a.kind] ?? "Other",
      subject, askedBy: whoText(c, a.makerEmployeeId),
      askedOn: ask === undefined ? reportDate(a.requestedOn) : stamp(ask.at),
      decider: whoText(c, a.checkerEmployeeId), decidedOn: "",
      outcome: "waiting", outcomeText: "Waiting", tookText: "",
      sortKey: `${a.requestedOn}T99` };
  });
  return [...waiting, ...done].sort((a, b) =>
    b.sortKey.localeCompare(a.sortKey));
}

/* ---------------------------------------------------------------- *
 * One payslip again, with one thing changed (what-if, parallel run)
 * ---------------------------------------------------------------- */

/** The engine path the payslip was made with (nationals: no pension). */
export function rerun(s: DemoPayslip, input: PayslipInput): Payslip {
  return s.basis === "calculatePayslip"
    ? calculatePayslip(input, DEFAULT_PAYROLL_PACKS).value
    : payslipWithoutPension(input).value;
}

export interface RunFigures { gross: Fils; deductions: Fils; net: Fils;
  /** Net pay that goes in the salary file (people with an IBAN). */
  inFile: Fils }

export const runFiguresOf = (slips: readonly { payslip: Payslip;
  included: boolean }[]): RunFigures => ({
  gross: sum(slips.map((s) => s.payslip.gross)),
  deductions: sum(slips.map((s) => s.payslip.totalDeductions)),
  net: sum(slips.map((s) => s.payslip.net)),
  inFile: sum(slips.filter((s) => s.included).map((s) => s.payslip.net)) });

export interface WhatIfChange {
  employeeId: string;
  /** New monthly basic in fils; undefined keeps the contract's. */
  basic?: Fils;
  /** Overtime minutes added in October (daytime, two hours a day). */
  extraOvertimeMinutes?: number;
}

export interface WhatIfResult {
  name: string;
  before: { gross: Fils; deductions: Fils; net: Fils };
  after: { gross: Fils; deductions: Fils; net: Fils };
  run: { before: RunFigures; after: RunFigures };
  /** What the engine was asked, in words. */
  asked: string[];
  /** Flags the engine raised on the new payslip, in its words. */
  flags: string[];
}

/** October working days with no overtime yet, two hours each. */
function addedOvertime(input: PayslipInput, minutes: number)
  : PayslipInput["overtime"] {
  const taken = new Set(input.overtime.map((o) => o.date));
  const out: PayslipInput["overtime"] = [];
  let left = minutes;
  for (const d of workingDaysBetween("2026-10-01", "2026-10-31")) {
    if (left <= 0) break;
    if (taken.has(d) || !isWorkingDay(d)) continue;
    const m = Math.min(120, left);
    out.push({ date: d, minutes: m, nightMinutes: 0 });
    left -= m;
  }
  return [...input.overtime, ...out];
}

export const WHAT_IF_MAX_OVERTIME_MINUTES = 40 * 60;

/** R09: the October run worked out again with one change. Not saved. */
export function whatIf(c: DemoCompany, w: WhatIfChange): WhatIfResult {
  const slip = c.payRun.payslips.find((s) => s.employeeId === w.employeeId);
  if (slip === undefined) throw new Error(`not on the run: ${w.employeeId}`);
  const extra = Math.max(0, Math.min(WHAT_IF_MAX_OVERTIME_MINUTES,
    Math.round(w.extraOvertimeMinutes ?? 0)));
  const input: PayslipInput = { ...slip.input,
    employee: { ...slip.input.employee,
      basicMonthly: w.basic ?? slip.input.employee.basicMonthly },
    overtime: extra === 0 ? slip.input.overtime
      : addedOvertime(slip.input, extra) };
  const after = rerun(slip, input);
  const all = c.payRun.payslips.map((s) => ({ payslip: s.payslip,
    included: s.sif.included }));
  const changed = c.payRun.payslips.map((s) => ({ payslip:
    s === slip ? after : s.payslip, included: s.sif.included }));
  const pick = (p: Payslip) => ({ gross: p.gross,
    deductions: p.totalDeductions, net: p.net });
  const asked = [
    ...(w.basic === undefined || w.basic === slip.input.employee.basicMonthly
      ? [] : [`Basic salary ${formatAed(w.basic)} a month instead of ` +
        formatAed(slip.input.employee.basicMonthly)]),
    ...(extra === 0 ? [] : [`${duration(extra)} more overtime, spread ` +
      "two hours a day over October working days, in the daytime"]),
  ];
  return { name: empOf(c, slip.employeeId).fullName,
    before: pick(slip.payslip), after: pick(after),
    run: { before: runFiguresOf(all), after: runFiguresOf(changed) },
    asked, flags: after.flags.map((f) => f.message) };
}

/* ---------------------------------------------------------------- *
 * Parallel run: our October against the old system's figures
 * ---------------------------------------------------------------- */

export type ParallelCauseKey = "back-pay" | "leaving-date" |
  "unpaid-leave" | "probation-sick" | "loan-cap" | "night-rate";

export interface ParallelCause {
  key: ParallelCauseKey;
  /** Data the old system holds differently, or a rule it applies. */
  kind: "data" | "rule";
  text: string;
  /** Our net less the old system's, from an engine run. */
  difference: Fils;
}

/**
 * What the old system would pay one person, cause by cause, each
 * worked out by running the engine on the old system's assumption.
 */
export function parallelCauses(c: DemoCompany, employeeId: string)
  : ParallelCause[] {
  const s = c.payRun.payslips.find((x) => x.employeeId === employeeId);
  if (s === undefined) return [];
  const e = empOf(c, employeeId);
  const has = (t: DemoEmployee["cases"][number]) => e.cases.includes(t);
  const net = s.payslip.net;
  const diff = (p: Payslip): Fils => fils(net - p.net);
  const out: ParallelCause[] = [];
  const i = s.input;
  if (has("back-pay")) {
    out.push({ key: "back-pay", kind: "data", difference: diff(rerun(s, {
      ...i, employee: { ...i.employee, basicMonthly: fils(
        i.employee.basicMonthly - BACK_PAY_RAISE), allowances:
        i.employee.allowances.filter((a) => a.code !== "back-pay") } })),
    text: "The old system still has the basic salary before the raise " +
      `from ${reportDate("2026-09-01")}, so it pays no back pay.` });
  }
  if (has("leaver") && i.employee.leavingDate !== null) {
    out.push({ key: "leaving-date", kind: "data", difference: diff(rerun(
      s, { ...i, employee: { ...i.employee, leavingDate: null } })),
    text: "The old system has no leaving date, so it pays the whole " +
      `month instead of up to ${displayDate(i.employee.leavingDate)}.` });
  }
  if (i.absences.some((a) => a.kind === "unpaid")) {
    out.push({ key: "unpaid-leave", kind: "data", difference: diff(rerun(
      s, { ...i, absences: i.absences.filter((a) => a.kind !== "unpaid") })),
    text: "The unpaid leave days are not in the old system, so it pays " +
      "them." });
  }
  if (has("probation") && i.absences.some((a) => a.kind === "sick")) {
    out.push({ key: "probation-sick", kind: "data", difference: diff(rerun(
      s, { ...i, absences: i.absences.filter((a) => a.kind !== "sick") })),
    text: "The sick day in probation is not in the old system, so it " +
      "pays it." });
  }
  const deferred = sum(s.payslip.deferred.map((d) => d.deferred));
  if (deferred !== 0n) {
    out.push({ key: "loan-cap", kind: "rule", difference: deferred,
      text: "The old system takes the whole loan instalment. We take " +
        "only what the deduction limit allows and carry the rest to " +
        "next month." });
  }
  if (i.overtime.some((o) => o.nightMinutes > 0)) {
    out.push({ key: "night-rate", kind: "rule", difference: diff(rerun(s, {
      ...i, overtime: i.overtime.map((o) => ({ ...o, nightMinutes: 0 }))
    })), text: "The old system pays night overtime at the daytime rate. " +
      "We pay the higher night rate." });
  }
  return out.filter((x) => x.difference !== 0n);
}

export interface ParallelSample {
  id: string;
  label: string;
  fileName: string;
  /** The CSV as the old system exports it. */
  text: string;
  note: string;
}

/** The people in the sample export, by case, so every seed has them. */
function sampleIds(c: DemoCompany): string[] {
  const byCase = (t: DemoEmployee["cases"][number]) =>
    c.employees.filter((e) => e.cases.includes(t)).map((e) => e.id);
  const ids = ["back-pay", "leaver", "unpaid-leave", "probation",
    "loan-over-cap", "night-overtime", "overtime", "missing-iban"]
    .flatMap((t) => byCase(t as DemoEmployee["cases"][number]));
  const rest = c.payRun.payslips.map((s) => s.employeeId)
    .filter((id) => !ids.includes(id)).slice(0, 4);
  return [...new Set([...ids, ...rest])].filter((id) =>
    c.payRun.payslips.some((s) => s.employeeId === id))
    .sort();
}

const aedText = (f: bigint): string =>
  `${f / 100n}.${String((f < 0n ? -f : f) % 100n).padStart(2, "0")}`;

export const PARALLEL_HEADER = "Employee no,Full name,Net pay (AED)";

function sampleText(c: DemoCompany, keep: (k: ParallelCause) => boolean)
  : string {
  const rows = sampleIds(c).map((id) => {
    const s = c.payRun.payslips.find((x) => x.employeeId === id)!;
    const e = empOf(c, id);
    const off = parallelCauses(c, id).filter(keep)
      .reduce((n, k) => n + k.difference, 0n);
    return `${e.number},${e.fullName},${aedText(s.payslip.net - off)}`;
  });
  return [PARALLEL_HEADER, ...rows].join("\n") + "\n";
}

/** S38: two built-in exports from your current system, October. */
export function parallelSamples(c: DemoCompany): ParallelSample[] {
  return [
    { id: "first", label: "First export, before clean-up",
      fileName: "old-system-october-2026-first-export.csv",
      text: sampleText(c, () => true),
      note: "The old system's October net pay as first exported, before " +
        "its records were brought up to date." },
    { id: "cleaned", label: "Second export, records brought up to date",
      fileName: "old-system-october-2026-second-export.csv",
      text: sampleText(c, (k) => k.kind === "rule"),
      note: "The same month after the raise, the leaving date and the " +
        "leave were entered in the old system. Only rule differences " +
        "remain." },
  ];
}

export type ParallelStatus = "matches" | "differs" | "not-ours" |
  "unreadable";

export interface ParallelRow {
  line: number;
  number: string;
  name: string;
  ours: Fils | null;
  theirs: Fils | null;
  difference: Fils | null;
  status: ParallelStatus;
  statusText: string;
  /** Likely causes whose engine differences add up to this one. */
  causes: ParallelCause[];
  explained: boolean;
  causeText: string;
}

export interface ParallelCompare {
  rows: ParallelRow[];
  matches: number;
  differs: number;
  explained: number;
  oursTotal: Fils;
  theirsTotal: Fils;
  summaryText: string;
}

const parseAedText = (v: string): bigint | null => {
  const m = /^\s*(-?)(\d+)(?:\.(\d{1,2}))?\s*$/.exec(v);
  if (m === null) return null;
  const f = BigInt(m[2]!) * 100n + BigInt((m[3] ?? "0").padEnd(2, "0"));
  return m[1] === "-" ? -f : f;
};

/** Causes whose differences add up to the whole difference, if any. */
function explain(cs: ParallelCause[], d: bigint): ParallelCause[] | null {
  for (let mask = 1; mask < 1 << cs.length; mask++) {
    const pick = cs.filter((_, i) => (mask & (1 << i)) !== 0);
    if (pick.reduce((n, k) => n + k.difference, 0n) === d) return pick;
  }
  return null;
}

/** Compare an old-system CSV with our October run, row by row. */
export function compareParallel(c: DemoCompany, csv: string)
  : ParallelCompare {
  const lines = csv.split(/\r?\n/).map((l, i) => ({ l, line: i + 1 }))
    .filter(({ l }, i) => i > 0 && l.trim() !== "");
  const rows = lines.map(({ l, line }): ParallelRow => {
    const [number = "", name = "", amount = ""] = l.split(",");
    const e = c.employees.find((x) => x.number === number.trim());
    const s = e === undefined ? undefined
      : c.payRun.payslips.find((x) => x.employeeId === e.id);
    const theirs = parseAedText(amount);
    const base = { line, number: number.trim(), name: name.trim(),
      causes: [] as ParallelCause[], explained: false };
    if (theirs === null) {
      return { ...base, ours: s?.payslip.net ?? null, theirs: null,
        difference: null, status: "unreadable",
        statusText: "Could not read", causeText: "The amount is not a " +
          "number this check can read." };
    }
    if (s === undefined) {
      return { ...base, ours: null, theirs: fils(theirs), difference: null,
        status: "not-ours", statusText: "Not in our run",
        causeText: "No one with this employee number is on our October " +
          "run." };
    }
    const d = s.payslip.net - theirs;
    if (d === 0n) {
      return { ...base, ours: s.payslip.net, theirs: fils(theirs),
        difference: fils(0n), status: "matches", statusText: "Matches",
        causeText: "", explained: true };
    }
    const found = explain(parallelCauses(c, s.employeeId), d);
    return { ...base, ours: s.payslip.net, theirs: fils(theirs),
      difference: fils(d), status: "differs", statusText: "Differs",
      causes: found ?? [], explained: found !== null,
      causeText: found === null ? "Not explained by a known cause: check " +
        "this person by hand." : found.map((k) => k.text).join(" ") };
  });
  const n = (st: ParallelStatus) => rows.filter((r) =>
    r.status === st).length;
  const differs = n("differs");
  const explained = rows.filter((r) => r.status === "differs" &&
    r.explained).length;
  const oursTotal = sum(rows.map((r) => r.ours ?? 0n));
  const theirsTotal = sum(rows.map((r) => r.theirs ?? 0n));
  return { rows, matches: n("matches"), differs, explained, oursTotal,
    theirsTotal, summaryText: `${rows.length} people in the file: ` +
      `${n("matches")} match exactly, ${differs} differ` +
      (differs === 0 ? "." : `, ${explained} of them with a likely ` +
        "cause.") };
}

/* ---------------------------------------------------------------- *
 * Pre-pay gate: contracts, and the sample limit for big changes
 * ---------------------------------------------------------------- */

/** A change in net pay above this share of last month's gets a look. */
export const VARIANCE_SAMPLE_LIMIT_PCT = 10;
export const VARIANCE_LIMIT_TEXT = `${VARIANCE_SAMPLE_LIMIT_PCT}% of last ` +
  "month's net pay (a sample limit you can change)";

export interface ContractMismatch { employeeId: string; name: string;
  text: string }

export interface ContractCheck { checked: number;
  mismatches: ContractMismatch[] }

/**
 * Each October payslip against the person's contract: the basic paid
 * is the contract's, inside its grade's band, and the allowances are
 * the contract's (back pay is an addition, explained on the payslip).
 */
export function contractCheck(c: DemoCompany): ContractCheck {
  const out: ContractMismatch[] = [];
  for (const s of c.payRun.payslips) {
    const e = empOf(c, s.employeeId);
    const paid = s.input.employee.basicMonthly;
    const floor = GRADE_BASIC[e.grade] ?? 0n;
    const top = floor + BASIC_STEP * 8n;
    if (paid !== e.basicMonthly) {
      out.push({ employeeId: e.id, name: e.fullName, text: "Basic salary " +
        `on the payslip is ${formatAed(paid)}; the contract says ` +
        `${formatAed(e.basicMonthly)}.` });
    } else if (paid < floor || paid > top) {
      out.push({ employeeId: e.id, name: e.fullName, text: "Basic salary " +
        `${formatAed(paid)} is outside the grade ${e.grade} band, ` +
        `${formatAed(fils(floor))} to ${formatAed(fils(top))}.` });
    }
    const contract = new Map(e.allowances.map((a) => [a.code, a.monthly]));
    const onSlip = s.input.employee.allowances.filter((a) =>
      a.code !== "back-pay");
    const same = onSlip.length === contract.size && onSlip.every((a) =>
      contract.get(a.code) === a.monthly);
    if (!same) {
      out.push({ employeeId: e.id, name: e.fullName, text: "Allowances " +
        "on the payslip are not the ones in the contract." });
    }
  }
  return { checked: c.payRun.payslips.length, mismatches: out };
}

/* ---------------------------------------------------------------- *
 * Custom fields: extra employee fields and where they show
 * ---------------------------------------------------------------- */

export interface CustomField {
  id: string;
  label: string;
  typeText: string;
  shownOn: string[];
  required: boolean;
  help: string;
}

/** S08: the bank's extra fields (samples; no values in the demo). */
export function customFields(): CustomField[] {
  const f = (id: string, label: string, typeText: string,
    shownOn: string[], required: boolean, help: string): CustomField =>
    ({ id, label, typeText, shownOn, required, help });
  return [
    f("cf-emergency", "Emergency contact", "Name and phone number",
      ["Profile", "Joiner checklist"], true, "Asked for on the first day."),
    f("cf-badge", "Staff badge number", "Text",
      ["Profile", "Attendance"], false, "Matches the door badge."),
    f("cf-cost-centre", "Cost centre code", "Choice from a list",
      ["Profile", "Payroll journal view", "Reports"], false,
      "For the finance team's own mapping."),
    f("cf-insurance", "Health insurance card number", "Text",
      ["Profile", "Documents"], false, "Shown masked on screen."),
    f("cf-language", "Languages spoken", "Several choices",
      ["Profile", "Branch staffing"], false, "Helps plan branch cover."),
    f("cf-parking", "Parking bay", "Text", ["Profile"], false,
      "Head office only."),
  ];
}

/** Where a custom field can never show, said once. */
export const CUSTOM_FIELD_LIMITS = "Extra fields never go in the salary " +
  "file and never change a payslip figure. They are kept with the " +
  "employee record and can be added to reports. No values " +
  `are held yet (as of ${reportDate(AS_OF)}).`;
