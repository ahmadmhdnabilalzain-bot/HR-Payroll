import {
  MONEY_MAX_FILS,
  NOT_COMPUTED_PAY,
  REIMBURSEMENT_WPS_NOTE,
  type PayRunEntry,
  type PayRunProblem,
  type Period,
  type SifBucket,
  type TraceLine,
  type WorkerClass,
} from "@payroll/contract";
import { fils, parseAed, type Fils } from "@payroll/engine";
import { applyReimbursements } from "../expenses/reimburse";
import { periodBounds } from "../leave/days";
import { settle, type ComputedSettlement } from "./compute-settlement";

/**
 * Pure pay-run arithmetic: entered amounts in, lines and trace out.
 * No database, clock, environment or randomness. Nothing on
 * NOT_COMPUTED_PAY is computed; there are no deduction lines.
 */
export interface SnapshotComponent {
  code: string;
  label: string;
  amount: Fils;
  sifBucket: SifBucket;
}

export interface SnapshotEmployee {
  employeeId: string;
  name: string;
  joiningDate: string;
  lastWorkingDate: string | null;
  workerClass: WorkerClass;
  salaryVersion: number;
  components: SnapshotComponent[];
  unpaidLeaveDays: number;
  /** As approved: the SIF is built from these, never from live rows. */
  bank: { routingCode: string; iban: string } | null;
  labourPersonId: string | null;
}

/** An approved expense claim paid with the run (outside gross). */
export interface SnapshotReimbursement {
  employeeId: string;
  claimId: string;
  title: string;
  amount: Fils;
}

export interface RunSnapshot {
  period: Period;
  employees: SnapshotEmployee[];
  entries: PayRunEntry[];
  /** Sorted by claimId, so the input hash covers them. */
  reimbursements: SnapshotReimbursement[];
}

export interface ComputedLine extends SnapshotComponent {
  kind: "recurring" | "override" | "one-off";
  traceId: string;
}

export interface ComputedPayslip {
  employeeId: string;
  employeeName: string;
  period: Period;
  lines: ComputedLine[];
  gross: Fils;
  net: Fils;
  notComputed: string[];
  settlement: ComputedSettlement | null;
  trace: TraceLine[];
  /** Plan 6: never in lines or gross; net = salaryNet + total. */
  reimbursements: ComputedReimbursement[];
  reimbursementTotal: Fils;
  salaryNet: Fils;
  reimbursementNote: typeof REIMBURSEMENT_WPS_NOTE | null;
}

export interface ComputedReimbursement {
  claimId: string;
  label: string;
  amount: Fils;
  traceId: string;
}

type Problem = PayRunProblem;
const problem = (employeeId: string, code: Problem["code"],
  missing: string[]): Problem => ({ employeeId, code, missing });

export function inPeriod(e: SnapshotEmployee, p: Period): boolean {
  const { first, last } = periodBounds(p);
  return e.joiningDate <= last &&
    (e.lastWorkingDate === null || e.lastWorkingDate >= first);
}

function isPartial(e: SnapshotEmployee, p: Period): boolean {
  const { first, last } = periodBounds(p);
  return e.joiningDate > first || e.unpaidLeaveDays > 0 ||
    (e.lastWorkingDate !== null && e.lastWorkingDate < last);
}

function isLeaver(e: SnapshotEmployee, p: Period): boolean {
  const { first, last } = periodBounds(p);
  return e.lastWorkingDate !== null && e.lastWorkingDate >= first &&
    e.lastWorkingDate <= last;
}

/** Codes that appear more than once (a second amount is never picked). */
const repeated = (cs: string[]) =>
  cs.filter((c, i) => cs.indexOf(c) !== i);

/**
 * Unknown override codes, one-off codes that clash with a component and
 * codes given twice are VALIDATION_FAILED; partial months need every
 * component entered; leavers need unusedLeaveDays and
 * serviceUnpaidLeaveDays (both HR-entered; neither is ever assumed).
 */
function entryProblems(e: SnapshotEmployee, x: PayRunEntry, p: Period)
  : Problem[] {
  const codes = e.components.map((c) => c.code);
  const out: Problem[] = [];
  const overCodes = (x.componentOverrides ?? []).map((o) => o.code);
  const oneOffCodes = (x.oneOffs ?? []).map((o) => o.code);
  const over = new Set(overCodes);
  const bad = new Set([
    ...overCodes.filter((c) => !codes.includes(c)),
    ...oneOffCodes.filter((c) => codes.includes(c)),
    ...repeated(overCodes), ...repeated(oneOffCodes)]);
  if (bad.size > 0) {
    out.push(problem(e.employeeId, "VALIDATION_FAILED", [...bad]));
  }
  if (isPartial(e, p) && codes.some((c) => !over.has(c))) {
    out.push(problem(e.employeeId, "ENTERED_AMOUNTS_REQUIRED",
      codes.filter((c) => !over.has(c))));
  }
  const settlementMissing = [
    ...(x.unusedLeaveDays === undefined ? ["unusedLeaveDays"] : []),
    ...(x.serviceUnpaidLeaveDays === undefined
      ? ["serviceUnpaidLeaveDays"] : [])];
  if (isLeaver(e, p) && settlementMissing.length > 0) {
    out.push(problem(e.employeeId, "SETTLEMENT_INPUT_REQUIRED",
      settlementMissing));
  }
  return out;
}

function traceOf(l: ComputedLine, version: number): TraceLine {
  const formula = { recurring: "entered monthly amount",
    override: "entered amount for this run",
    "one-off": "entered one-off amount" }[l.kind];
  return { id: l.traceId, label: l.label, formula,
    inputs: l.kind === "recurring" ? { salaryVersion: String(version) }
      : { entry: "pay run input" },
    result: String(l.amount), rules: [] };
}

function linesOf(e: SnapshotEmployee, x: PayRunEntry): ComputedLine[] {
  const over = new Map((x.componentOverrides ?? []).map((o) =>
    [o.code, parseAed(o.amount)]));
  const recurring = e.components.map((c): ComputedLine => {
    const o = over.get(c.code);
    return o === undefined
      ? { ...c, kind: "recurring", traceId: `pay.${c.code}` }
      : { ...c, amount: o, kind: "override", traceId: `pay.${c.code}` };
  });
  const oneOffs = (x.oneOffs ?? []).map((o): ComputedLine => ({
    code: o.code, label: o.label, amount: parseAed(o.amount),
    sifBucket: o.sifBucket, kind: "one-off", traceId: `pay.${o.code}` }));
  return [...recurring, ...oneOffs];
}

function payslipOf(e: SnapshotEmployee, x: PayRunEntry, p: Period)
  : ComputedPayslip {
  const lines = linesOf(e, x);
  const gross = fils(lines.reduce((n, l) => n + l.amount, 0n));
  const basic = e.components.find((c) => c.code === "basic")!.amount;
  const settlement = isLeaver(e, p) ? settle({
    joiningDate: e.joiningDate, lastWorkingDate: e.lastWorkingDate!,
    workerClass: e.workerClass }, basic, x.serviceUnpaidLeaveDays!,
    x.unusedLeaveDays!) : null;
  return { employeeId: e.employeeId, employeeName: e.name, period: p,
    lines, gross, net: gross, notComputed: [...NOT_COMPUTED_PAY],
    settlement, trace: lines.map((l) => traceOf(l, e.salaryVersion)),
    reimbursements: [], reimbursementTotal: fils(0n), salaryNet: gross,
    reimbursementNote: null };
}

function entryMap(s: RunSnapshot, problems: Problem[]) {
  const byId = new Map<string, PayRunEntry>();
  const known = new Set(s.employees.filter((e) => inPeriod(e, s.period))
    .map((e) => e.employeeId));
  for (const x of s.entries) {
    if (!known.has(x.employeeId)) {
      problems.push(problem(x.employeeId, "EMPLOYEE_NOT_IN_PERIOD", []));
    } else if (byId.has(x.employeeId)) {
      problems.push(problem(x.employeeId, "VALIDATION_FAILED",
        ["duplicate entry"]));
    } else byId.set(x.employeeId, x);
  }
  return byId;
}

/** Every problem is returned; payslips only when there are none. */
export function computePayRun(s: RunSnapshot): { problems: Problem[];
  payslips: ComputedPayslip[]; gross: Fils } {
  const problems: Problem[] = [];
  const entries = entryMap(s, problems);
  const paid = s.employees.filter((e) => inPeriod(e, s.period));
  for (const e of paid) {
    const x = entries.get(e.employeeId) ?? { employeeId: e.employeeId };
    if (e.components.length === 0) {
      problems.push(problem(e.employeeId, "SALARY_MISSING", ["salary"]));
    } else problems.push(...entryProblems(e, x, s.period));
    const wps = [...(e.bank === null ? ["bank"] : []),
      ...(e.labourPersonId === null ? ["labourPersonId"] : [])];
    if (wps.length > 0) {
      problems.push(problem(e.employeeId, "EMPLOYEE_BANK_MISSING", wps));
    }
  }
  if (problems.length > 0) return { problems, payslips: [], gross: fils(0n) };
  // Reimbursements are added last, after the salary net is known.
  const payslips = paid.map((e) => applyReimbursements(payslipOf(e,
    entries.get(e.employeeId) ?? { employeeId: e.employeeId }, s.period),
  s.reimbursements));
  const gross = fils(payslips.reduce((n, p) => n + p.gross, 0n));
  problems.push(...capProblems(payslips, gross));
  if (problems.length > 0) return { problems, payslips: [], gross: fils(0n) };
  return { problems, payslips, gross };
}

/**
 * Amounts the wire format cannot carry (above 999,999,999.99 AED): a
 * payslip gross or net (with reimbursements), a settlement total,
 * or the run gross (reported on the
 * last employee).
 */
function capProblems(ps: ComputedPayslip[], gross: Fils): Problem[] {
  const out: Problem[] = [];
  for (const p of ps) {
    const s = p.settlement;
    const over = [
      ...(p.gross > MONEY_MAX_FILS ? ["gross"] : []),
      ...(p.net > MONEY_MAX_FILS && p.gross <= MONEY_MAX_FILS
        ? ["net"] : []),
      ...(s?.status === "computed" && s.total > MONEY_MAX_FILS
        ? ["settlement"] : [])];
    if (over.length > 0) {
      out.push(problem(p.employeeId, "VALIDATION_FAILED", over));
    }
  }
  const last = ps.at(-1);
  if (out.length === 0 && gross > MONEY_MAX_FILS && last !== undefined) {
    out.push(problem(last.employeeId, "VALIDATION_FAILED", ["runGross"]));
  }
  return out;
}
