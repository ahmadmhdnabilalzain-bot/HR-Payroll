import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  type Allowance,
  type Fils,
  type Payslip,
  type PayslipInput,
} from "@payroll/engine";
import { payslipWithoutPension } from "./pension";
import { departmentText } from "./wp3";
import type { DemoCompany, DemoPayslip } from "./types";

/**
 * WPE pay-structure sandbox: a draft change to how people are paid,
 * worked out again for October on a COPY of each payslip input. The
 * engine path is the one the run used (calculatePayslip; for UAE
 * nationals the same steps without the pension step). Nothing here
 * touches the October run, the stored payslips or any other figure.
 * The drafts are FICTIONAL, written to show a change before it is
 * planned; the pension for UAE nationals stays not computed.
 */

export type SandboxKind = "housing-raise" | "new-allowance" |
  "overtime-rates";

/** One draft. Flat, so a screen can keep it as plain state. */
export interface SandboxDraft {
  kind: SandboxKind;
  /** The grade it applies to; null: everyone on the run. */
  grade: number | null;
  /** housing-raise: the rise in basis points (500 = 5%). */
  percentBps: number;
  /** new-allowance: the monthly amount. */
  monthly: Fils;
  /** overtime-rates: the uplifts in basis points. */
  dayBps: number;
  nightBps: number;
}

export const NEW_ALLOWANCE_CODE = "sandbox-transport";
export const NEW_ALLOWANCE_LABEL = "Transport top-up";

/** The values the pack in force uses (no change by default). */
const PACK_DAY_BPS = 2500;
const PACK_NIGHT_BPS = 5000;

export const SANDBOX_NOT_SAVED = "A sandbox: nothing here changes the " +
  "October run, a payslip or the salary file.";

export const EMPLOYER_NOTE = "Employer cost is gross pay plus the " +
  "employer amounts the engine computed. Employer pension for UAE " +
  "nationals is Not computed, so the figure is partial.";

const NEUTRAL: SandboxDraft = { kind: "housing-raise", grade: null,
  percentBps: 0, monthly: fils(0n), dayBps: PACK_DAY_BPS,
  nightBps: PACK_NIGHT_BPS };

/** A draft of one kind with the other fields at "no change". */
export function newDraft(kind: SandboxKind,
  over: Partial<SandboxDraft> = {}): SandboxDraft {
  return { ...NEUTRAL, kind, ...over };
}

const pct = (bps: number): string => `${bps / 100}%`;
const gradeText = (g: number): string => `G${g}`;

export function draftTitle(d: SandboxDraft): string {
  const who = d.grade === null ? "everyone" : `grade ${gradeText(d.grade)}`;
  switch (d.kind) {
    case "housing-raise":
      return `Raise housing allowance ${pct(d.percentBps)} for ${who}`;
    case "new-allowance":
      return `Add ${NEW_ALLOWANCE_LABEL.toLowerCase()} of ` +
        `${formatAed(d.monthly)} a month for ${who}`;
    case "overtime-rates":
      return `Overtime uplift: day ${pct(d.dayBps)}, ` +
        `night ${pct(d.nightBps)}`;
  }
}

export interface SandboxOptions {
  /** Grades with people on the October run, lowest first. */
  grades: { grade: number; text: string; people: number }[];
  percents: { bps: number; text: string }[];
  allowances: { monthly: Fils; text: string }[];
  dayUplifts: { bps: number; text: string }[];
  nightUplifts: { bps: number; text: string }[];
  presets: { id: string; title: string; draft: SandboxDraft }[];
}

const PERCENTS = [500, 1000];
const ALLOWANCES = [20000n, 30000n, 50000n];
const DAY = [2500, 3000, 3500];
const NIGHT = [5000, 6000, 7000];

export function sandboxOptions(c: DemoCompany): SandboxOptions {
  const counts = new Map<number, number>();
  for (const s of c.payRun.payslips) {
    const g = c.employees.find((e) => e.id === s.employeeId)!.grade;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const grades = [...counts.entries()].sort((a, b) => a[0] - b[0])
    .map(([grade, people]) => ({ grade, text: gradeText(grade), people }));
  const g4 = grades.find((g) => g.grade === 4) ?? grades[0]!;
  return { grades,
    percents: PERCENTS.map((bps) => ({ bps, text: pct(bps) })),
    allowances: ALLOWANCES.map((n) => ({ monthly: fils(n),
      text: formatAed(fils(n)) })),
    dayUplifts: DAY.map((bps) => ({ bps, text: pct(bps) })),
    nightUplifts: NIGHT.map((bps) => ({ bps, text: pct(bps) })),
    presets: [
      { id: "housing", draft: newDraft("housing-raise",
        { grade: g4.grade, percentBps: 500 }), title: "" },
      { id: "transport", draft: newDraft("new-allowance",
        { monthly: fils(30000n) }), title: "" },
      { id: "overtime", draft: newDraft("overtime-rates",
        { dayBps: 3000, nightBps: 6000 }), title: "" },
    ].map((p) => ({ ...p, title: draftTitle(p.draft) })) };
}

/** What a draft is made of, checked before it is run. */
export function draftProblem(d: SandboxDraft): string | null {
  if (d.kind === "housing-raise" &&
    (d.percentBps <= 0 || d.percentBps > 2000)) {
    return "Choose a rise from 0.01% to 20%.";
  }
  if (d.kind === "new-allowance" && d.monthly <= 0n) {
    return "Choose an amount above zero.";
  }
  if (d.kind === "overtime-rates" &&
    (d.dayBps < 0 || d.nightBps < d.dayBps)) {
    return "The night uplift is at least the day uplift.";
  }
  return null;
}

export interface SandboxLine { label: string; before: Fils; after: Fils }

export interface SandboxRow {
  employeeId: string;
  name: string;
  department: string;
  gradeText: string;
  /** True for a UAE national: pension and employer pension not computed. */
  pensionNotComputed: boolean;
  before: { gross: Fils; deductions: Fils; net: Fils };
  after: { gross: Fils; deductions: Fils; net: Fils };
  difference: { gross: Fils; deductions: Fils; net: Fils;
    employer: Fils; employerCost: Fils };
  /** Every earning line that moves, October as run and in the sandbox. */
  lines: SandboxLine[];
  display: { net: string; gross: string; employerCost: string };
}

export interface SandboxTotals {
  beforeNet: Fils;
  afterNet: Fils;
  net: Fils;
  gross: Fils;
  deductions: Fils;
  employerCost: Fils;
}

export interface SandboxResult {
  draft: SandboxDraft;
  title: string;
  scopeText: string;
  /** Payslips on the October run that the draft could reach. */
  inScope: number;
  rows: SandboxRow[];
  unchanged: number;
  /** People in the rows with no employer pension figure. */
  pensionNotComputed: number;
  totals: SandboxTotals;
  summaryText: string;
  display: { net: string; gross: string; employerCost: string;
    runNet: string };
}

export const signedAed = (f: bigint): string => f === 0n
  ? formatAed(fils(0n)) : f > 0n ? `+${formatAed(fils(f))}`
    : formatAed(fils(f));

const sum = (xs: readonly bigint[]): bigint =>
  xs.reduce((n, x) => n + x, 0n);

/** Half up to the fils. */
const rise = (monthly: bigint, bps: number): bigint =>
  (monthly * BigInt(bps) + 5000n) / 10000n;

function allowancesOf(input: PayslipInput, d: SandboxDraft): Allowance[] {
  const mine = input.employee.allowances;
  if (d.kind === "housing-raise") {
    return mine.map((a) => a.kind === "housing"
      ? { ...a, monthly: fils(a.monthly + rise(a.monthly, d.percentBps)) }
      : a);
  }
  if (d.kind === "new-allowance") {
    return [...mine, { code: NEW_ALLOWANCE_CODE, kind: "conveyance",
      monthly: d.monthly }];
  }
  return mine;
}

function overridesOf(d: SandboxDraft): Record<string, number> | undefined {
  return d.kind === "overtime-rates" ? { overtimeUpliftBps: d.dayBps,
    nightOvertimeUpliftBps: d.nightBps } : undefined;
}

/**
 * One payslip again by the path the run used. A copy of the input goes
 * in; the stored input and payslip are never changed.
 */
export function sandboxPayslip(s: DemoPayslip, input: PayslipInput,
  ov?: Record<string, number>): Payslip {
  return s.basis === "calculatePayslip"
    ? calculatePayslip(input, DEFAULT_PAYROLL_PACKS, ov).value
    : payslipWithoutPension(input, ov).value;
}

type Earning = Payslip["earnings"][number];

/** Earning lines matched by kind and label; those that move. */
function movedLines(before: Earning[], after: Earning[]): SandboxLine[] {
  const key = (l: Earning): string => `${l.kind}|${l.label}`;
  const keys = [...new Set([...before, ...after].map(key))];
  const total = (xs: Earning[], k: string): Fils => fils(sum(xs
    .filter((l) => key(l) === k).map((l) => l.amount)));
  const label = (k: string): string => (before.concat(after)
    .find((l) => key(l) === k)!).label;
  return keys.map((k) => ({ label: label(k), before: total(before, k),
    after: total(after, k) })).filter((l) => l.before !== l.after);
}

const NO_OVERTIME = "A person with no overtime in October does not move.";

function scopeOf(d: SandboxDraft): string {
  if (d.kind === "overtime-rates") {
    return `Everyone on the October run; ${NO_OVERTIME}`;
  }
  return d.grade === null ? "Everyone on the October run"
    : `People in grade ${gradeText(d.grade)} on the October run`;
}

/** The October run, worked out again with the draft. Not saved. */
export function sandboxRun(c: DemoCompany, d: SandboxDraft)
  : SandboxResult {
  const ov = overridesOf(d);
  const rows: SandboxRow[] = [];
  let inScope = 0;
  for (const s of c.payRun.payslips) {
    const e = c.employees.find((x) => x.id === s.employeeId)!;
    const inGrade = d.kind === "overtime-rates" || d.grade === null ||
      e.grade === d.grade;
    if (!inGrade) continue;
    inScope += 1;
    const input: PayslipInput = { ...s.input, employee: { ...s.input
      .employee, allowances: allowancesOf(s.input, d) } };
    const next = sandboxPayslip(s, input, ov);
    const now = s.payslip;
    if (next.net === now.net && next.gross === now.gross) continue;
    const grossDiff = next.gross - now.gross;
    const employer = next.employerCost - now.employerCost;
    const national = s.basis !== "calculatePayslip";
    const employerCost = grossDiff + employer;
    rows.push({ employeeId: e.id, name: e.fullName,
      department: departmentText(e.departmentId),
      gradeText: gradeText(e.grade), pensionNotComputed: national,
      before: { gross: now.gross, deductions: now.totalDeductions,
        net: now.net },
      after: { gross: next.gross, deductions: next.totalDeductions,
        net: next.net },
      difference: { gross: fils(grossDiff),
        deductions: fils(next.totalDeductions - now.totalDeductions),
        net: fils(next.net - now.net), employer: fils(employer),
        employerCost: fils(employerCost) },
      lines: movedLines(now.earnings, next.earnings),
      display: { net: signedAed(next.net - now.net),
        gross: signedAed(grossDiff), employerCost: signedAed(employerCost) },
    });
  }
  rows.sort((a, b) => a.difference.net > b.difference.net ? -1
    : a.difference.net < b.difference.net ? 1
      : a.name.localeCompare(b.name));
  const net = sum(rows.map((r) => r.difference.net));
  const gross = sum(rows.map((r) => r.difference.gross));
  const employerCost = sum(rows.map((r) => r.difference.employerCost));
  const beforeNet = c.payRun.totals.net;
  const missing = rows.filter((r) => r.pensionNotComputed).length;
  const title = draftTitle(d);
  return { draft: d, title, scopeText: scopeOf(d), inScope, rows,
    unchanged: c.payRun.payslips.length - rows.length,
    pensionNotComputed: missing,
    totals: { beforeNet, afterNet: fils(beforeNet + net),
      net: fils(net), gross: fils(gross), deductions: fils(
        sum(rows.map((r) => r.difference.deductions))),
      employerCost: fils(employerCost) },
    summaryText: rows.length === 0
      ? "This draft moves nobody's October pay."
      : `${rows.length} ${rows.length === 1 ? "person" : "people"} ` +
        `would move; ${c.payRun.payslips.length - rows.length} stay the ` +
        `same. Net pay moves by ${signedAed(net)}.`,
    display: { net: signedAed(net), gross: signedAed(gross),
      employerCost: signedAed(employerCost),
      runNet: formatAed(fils(beforeNet + net)) } };
}
