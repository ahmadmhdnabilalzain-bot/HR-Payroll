import {
  calculatePayslip,
  daysBetween,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  isValidIsoDate,
  type Allowance,
  type Fils,
  type PayslipInput,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural } from "./display";
import { pastPayslipInput, salaryRevisions } from "./pay";
import { payslipInput } from "./pay-inputs";
import { staffRequests } from "./papers";
import { payslipWithoutPension } from "./pension";
import { GRADE_BASIC, GRADE_TRANSPORT } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import { jobCatalogue } from "./wpd-structure";
import { departmentText, shortDateText } from "./wp3";
import { payrollHistory, reportMonth } from "./wp7";
import { workforcePlan } from "./wpe-planning";

/**
 * WPE checks: rule-based anomaly checks on the October run against
 * September (R43), the cost-of-hire preview (P20) and the report
 * templates library (X12). FICTIONAL. The checks are plain rules with
 * sample thresholds, no learning and no prediction; each finding is a
 * question for a person, never a verdict. Every money figure is a
 * payslip the engine works out; the only typed amounts are the demo
 * placeholders in HIRE_PLACEHOLDERS, labelled as such.
 */

const sum = (xs: readonly bigint[]): bigint => xs.reduce((n, x) => n + x, 0n);
const abs = (n: bigint): bigint => n < 0n ? -n : n;

// ---------------------------------------------------------------
// Anomaly checks (R43)
// ---------------------------------------------------------------

/** SAMPLE thresholds. Policy choices, not derived; shown on the page. */
export const ANOMALY_THRESHOLDS = {
  /** Net pay moved by at least this share of last month's, and... */
  swingPercent: 5n,
  /** ...at least this much (fils). */
  swingMinFils: 50000n,
  /** Overtime is a spike from this many minutes in the month... */
  overtimeMinMinutes: 120,
  /** ...and more than this many times the person's busiest earlier month. */
  overtimeTimes: 2,
  /** A bank detail is recent within this many days of the demo's today. */
  bankRecentDays: 30,
} as const;

export type AnomalyRuleId = "net-swing" | "new-payee" | "removed-payee" |
  "duplicate-iban" | "overtime-spike" | "salary-no-revision" |
  "bank-changed";

export interface AnomalyRule {
  id: AnomalyRuleId;
  label: string;
  /** The question the rule asks, in plain words. */
  asks: string;
  /** The sample threshold, in words. */
  sample: string;
}

export const ANOMALY_RULES: readonly AnomalyRule[] = [
  { id: "net-swing", label: "Big net pay change",
    asks: "Did someone's net pay move a lot since last month?",
    sample: `${ANOMALY_THRESHOLDS.swingPercent}% or more, and at least ` +
      formatAed(fils(ANOMALY_THRESHOLDS.swingMinFils)) },
  { id: "new-payee", label: "New on the run",
    asks: "Is someone paid this month who was not paid last month?",
    sample: "Any person not in last month's run" },
  { id: "removed-payee", label: "Dropped off the run",
    asks: "Was someone paid last month who is not on this run?",
    sample: "Any person not in this month's run" },
  { id: "duplicate-iban", label: "Same bank account twice",
    asks: "Do two people share one bank account number?",
    sample: "Two or more people with the same IBAN" },
  { id: "overtime-spike", label: "Overtime jump",
    asks: "Did someone work far more overtime than in earlier months?",
    sample: `${ANOMALY_THRESHOLDS.overtimeMinMinutes / 60} hours or more, ` +
      `over ${ANOMALY_THRESHOLDS.overtimeTimes} times their busiest month` },
  { id: "salary-no-revision", label: "Pay change, no revision",
    asks: "Did basic pay change with no salary revision on record?",
    sample: "Basic differs from last month, no revision recorded" },
  { id: "bank-changed", label: "Bank details changed",
    asks: "Were someone's bank details changed or asked for recently?",
    sample: `In the last ${ANOMALY_THRESHOLDS.bankRecentDays} days` },
];

/** The rules as pure functions over small inputs (tested alone). */
export function netSwings(rows: readonly { id: string; before: bigint;
  now: bigint }[]): string[] {
  const t = ANOMALY_THRESHOLDS;
  return rows.filter((r) => {
    const d = abs(r.now - r.before);
    return d >= t.swingMinFils && d * 100n >= r.before * t.swingPercent;
  }).map((r) => r.id);
}

export function addedAndRemoved(before: readonly string[],
  now: readonly string[]): { added: string[]; removed: string[] } {
  return { added: now.filter((id) => !before.includes(id)),
    removed: before.filter((id) => !now.includes(id)) };
}

/** Groups of people who share one account; singles and blanks left out. */
export function duplicateAccounts(rows: readonly { id: string;
  iban: string | null }[]): string[][] {
  const by = new Map<string, string[]>();
  for (const r of rows) {
    if (r.iban === null) continue;
    by.set(r.iban, [...(by.get(r.iban) ?? []), r.id]);
  }
  return [...by.values()].filter((g) => g.length > 1);
}

export function overtimeSpikes(rows: readonly { id: string; now: number;
  earlierMax: number }[]): string[] {
  const t = ANOMALY_THRESHOLDS;
  return rows.filter((r) => r.now >= t.overtimeMinMinutes &&
    r.now > r.earlierMax * t.overtimeTimes).map((r) => r.id);
}

export function salaryWithoutRevision(rows: readonly { id: string;
  before: bigint; now: bigint; hasRevision: boolean }[]): string[] {
  return rows.filter((r) => r.before !== r.now && !r.hasRevision)
    .map((r) => r.id);
}

export interface AnomalyFigure { label: string; value: Fils;
  signed?: boolean }

export interface AnomalyFinding {
  /** "net-swing:emp-014": stable, so a mark survives a refresh. */
  id: string;
  ruleId: AnomalyRuleId;
  ruleLabel: string;
  employeeId: string;
  name: string;
  departmentText: string;
  /** One sentence, no amounts (the figures carry them). */
  what: string;
  figures: AnomalyFigure[];
}

export interface AnomalyReport {
  month: string;
  monthText: string;
  against: string;
  againstText: string;
  findings: AnomalyFinding[];
  rules: (AnomalyRule & { count: number })[];
  basis: string;
}

export const ANOMALY_BASIS = "These are plain rules with sample " +
  "thresholds, run on the same figures as the pay run. They do not " +
  "learn and do not predict; each one is a question for a person. " +
  "Marking a finding reviewed or expected is a note in the audit trail, " +
  "not a change to pay.";

export interface AnomalyInput {
  /** People whose bank account was saved in this session. */
  bankSaved?: readonly string[];
}

const hoursText = (minutes: number): string => {
  const h = minutes / 60;
  return h === 1 ? "1 hour" : `${h} hours`;
};

const nameOf = (c: DemoCompany, id: string): string =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

/** Findings for the latest run against the month before it. */
export function anomalyChecks(c: DemoCompany, input: AnomalyInput = {})
  : AnomalyReport {
  const hist = payrollHistory(c);
  const now = hist[hist.length - 1]!;
  const before = hist[hist.length - 2]!;
  const prior = new Map(before.lines.map((l) => [l.employeeId, l]));
  const byId = new Map(c.employees.map((e) => [e.id, e]));
  const out: AnomalyFinding[] = [];
  const add = (ruleId: AnomalyRuleId, id: string, what: string,
    figures: AnomalyFigure[] = []): void => {
    const rule = ANOMALY_RULES.find((r) => r.id === ruleId)!;
    out.push({ id: `${ruleId}:${id}`, ruleId, ruleLabel: rule.label,
      employeeId: id, name: nameOf(c, id),
      departmentText: departmentText(byId.get(id)?.departmentId ?? ""),
      what, figures });
  };
  const both = now.lines.filter((l) => prior.has(l.employeeId));

  for (const id of netSwings(both.map((l) => ({ id: l.employeeId,
    before: prior.get(l.employeeId)!.net, now: l.net })))) {
    const l = now.lines.find((x) => x.employeeId === id)!;
    const o = prior.get(id)!;
    add("net-swing", id, `Net pay moved since ${reportMonth(before.month)}.`,
      [{ label: reportMonth(before.month), value: o.net },
        { label: reportMonth(now.month), value: l.net },
        { label: "Change", value: fils(l.net - o.net), signed: true }]);
  }
  const ar = addedAndRemoved(before.lines.map((l) => l.employeeId),
    now.lines.map((l) => l.employeeId));
  for (const id of ar.added) {
    const e = byId.get(id);
    add("new-payee", id, e === undefined ? "Paid for the first time."
      : `Paid for the first time. Joined ${shortDateText(e.joiningDate)}.`,
    [{ label: "Net pay", value: now.lines.find((x) =>
      x.employeeId === id)!.net }]);
  }
  for (const id of ar.removed) {
    add("removed-payee", id, `Paid in ${reportMonth(before.month)}, ` +
      "not on this run.", [{ label: "Last net pay",
      value: prior.get(id)!.net }]);
  }
  for (const group of duplicateAccounts(c.employees.map((e) => ({
    id: e.id, iban: e.iban?.value ?? null })))) {
    for (const id of group) {
      const others = group.filter((x) => x !== id).map((x) =>
        nameOf(c, x));
      add("duplicate-iban", id, `Shares a bank account with ` +
        `${others.join(" and ")}.`);
    }
  }
  const earlier = hist.slice(0, -1);
  for (const id of overtimeSpikes(now.lines.map((l) => ({
    id: l.employeeId, now: l.overtimeMinutes,
    earlierMax: Math.max(0, ...earlier.map((m) => m.lines.find((x) =>
      x.employeeId === l.employeeId)?.overtimeMinutes ?? 0)) })))) {
    const l = now.lines.find((x) => x.employeeId === id)!;
    const peak = Math.max(0, ...earlier.map((m) => m.lines.find((x) =>
      x.employeeId === id)?.overtimeMinutes ?? 0));
    add("overtime-spike", id, `${hoursText(l.overtimeMinutes)} of ` +
      "overtime this month, " + (peak === 0 ? "none in any month before."
      : `against ${hoursText(peak)} in their busiest month before.`),
    [{ label: "Overtime pay", value: l.overtimeAmount }]);
  }
  const revised = new Set(salaryRevisions(c).map((r) => r.employeeId));
  for (const id of salaryWithoutRevision(c.payRun.payslips.flatMap((s) => {
    const e = byId.get(s.employeeId);
    return e === undefined || !prior.has(e.id) ? [] : [{ id: e.id,
      before: pastPayslipInput(e, 9).employee.basicMonthly as bigint,
      now: s.input.employee.basicMonthly as bigint,
      hasRevision: revised.has(e.id) }];
  }))) {
    add("salary-no-revision", id, "Basic pay differs from last month " +
      "and no salary revision is on record.");
  }
  const recent = (iso: string): boolean => {
    const d = daysBetween(iso, AS_OF);
    return d >= 0 && d <= ANOMALY_THRESHOLDS.bankRecentDays;
  };
  const bank = new Map<string, string>();
  for (const r of staffRequests(c)) {
    if (r.kind === "bank-details" && r.status !== "done" &&
      recent(r.raisedOn)) {
      bank.set(r.employeeId, `Asked to change bank details on ` +
        `${shortDateText(r.raisedOn)}.`);
    }
  }
  for (const id of input.bankSaved ?? []) {
    bank.set(id, `A bank account was saved on ${shortDateText(AS_OF)}.`);
  }
  for (const [id, what] of bank) add("bank-changed", id, what);

  const order = new Map(ANOMALY_RULES.map((r, i) => [r.id, i]));
  out.sort((a, b) => order.get(a.ruleId)! - order.get(b.ruleId)! ||
    a.employeeId.localeCompare(b.employeeId));
  return { month: now.month, monthText: reportMonth(now.month),
    against: before.month, againstText: reportMonth(before.month),
    findings: out, basis: ANOMALY_BASIS,
    rules: ANOMALY_RULES.map((r) => ({ ...r,
      count: out.filter((f) => f.ruleId === r.id).length })) };
}

// ---------------------------------------------------------------
// Cost-of-hire preview (P20)
// ---------------------------------------------------------------

/** Where the budget comparison and the dates run to. */
export const HIRE_YEAR = 2027;
export const HIRE_LATEST_START = `${HIRE_YEAR}-12-31`;

export interface HirePlaceholder { id: string; label: string;
  amount: Fils; note: string; foreignOnly: boolean }

/**
 * DEMO ESTIMATES: typed placeholders, not a fee schedule and not a
 * quote. They stay out of the engine's figures and are shown apart.
 */
export const HIRE_PLACEHOLDERS: readonly HirePlaceholder[] = [
  { id: "visa", label: "Visa and Emirates ID processing",
    amount: fils(350000n), foreignOnly: true,
    note: "Demo estimate. No fee schedule is loaded." },
  { id: "medical", label: "Medical test", amount: fils(40000n),
    foreignOnly: true, note: "Demo estimate, not a quote." },
  { id: "insurance", label: "Health insurance, first year",
    amount: fils(720000n), foreignOnly: false,
    note: "Demo estimate, not a quote." },
];

export interface HireRole { jobKey: string; title: string;
  departmentId: string; departmentText: string; gradeMin: number;
  gradeMax: number }

/** The roles the company already has, with the department they sit in. */
export function hireRoles(c: DemoCompany): HireRole[] {
  return jobCatalogue(c).map((j) => ({ jobKey: j.jobKey, title: j.title,
    departmentId: j.departmentIds[0]!, departmentText: departmentText(
      j.departmentIds[0]!), gradeMin: j.gradeMin, gradeMax: j.gradeMax }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export interface HireInput { jobKey: string; grade: number;
  startIso: string; national: boolean }

/** The pay package at the foot of a grade (the roster's own rule). */
export function hirePackage(grade: number): { basic: Fils;
  allowances: Allowance[] } {
  const basic = GRADE_BASIC[grade];
  const transport = GRADE_TRANSPORT[grade];
  if (basic === undefined || transport === undefined) {
    throw new Error(`DEMO_NO_GRADE: ${grade}`);
  }
  const allowances: Allowance[] = [
    { code: "housing", kind: "housing", monthly: fils(basic * 40n / 100n) },
    { code: "transport", kind: "conveyance", monthly: fils(transport) }];
  if (grade >= 7) {
    allowances.push({ code: "phone", kind: "other", monthly: fils(50000n) });
  }
  return { basic: fils(basic), allowances };
}

export interface HireMonth { month: string; label: string; gross: Fils;
  part: boolean }

export interface HireBudget {
  departmentId: string;
  departmentText: string;
  year: number;
  /** The department's planned payroll for the year (gross, estimate). */
  planned: Fils;
  /** What the hire costs inside that year (gross, from the start). */
  hireInYear: Fils;
  withHire: Fils;
  /** Seats open with no accepted offer: not priced in the plan. */
  unpricedSeats: number;
  basis: string;
}

export interface HirePreview {
  problems: string[];
  role: HireRole | null;
  national: boolean;
  startText: string;
  basicText: string;
  allowances: { label: string; monthly: Fils }[];
  /** A full month's gross, from the engine. */
  monthlyGross: Fils;
  months: HireMonth[];
  firstYearGross: Fils;
  /** Employer-side cost lines the engine computed; none: not computed. */
  employer: { status: "computed"; amount: Fils } |
    { status: "not-computed"; note: string };
  placeholders: { label: string; amount: Fils; note: string }[];
  placeholdersTotal: Fils;
  /** Engine gross plus the demo placeholders. */
  firstYearTotal: Fils;
  budget: HireBudget | null;
  basis: string;
}

export const HIRE_BASIS = "Pay is worked out by the payroll engine for " +
  "twelve payroll months from the start date, at the foot of the " +
  "grade's pay band; the first month is part of a month. Visa, medical " +
  "and insurance lines are demo estimates, kept apart from the " +
  "engine's figures. Gratuity and other costs are not included.";

export const HIRE_EMPLOYER_NOTE = "Not computed. The rules loaded work " +
  "out no employer-side cost for this person.";
export const HIRE_PENSION_NOTE = "Pension: Not computed.";

const ALLOWANCE_TEXT: Record<string, string> = { housing: "Housing",
  transport: "Transport", phone: "Phone" };

const pad = (n: number): string => String(n).padStart(2, "0");
const isoOk = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  isValidIsoDate(s);

function slip(template: DemoEmployee, pkg: ReturnType<typeof hirePackage>,
  start: string, national: boolean, year: number, month: number) {
  const base = payslipInput(template, { year, month });
  const input: PayslipInput = { ...base, employee: { ...base.employee,
    workerClass: national ? "uae-national" : "expat-full-time",
    joiningDate: start, leavingDate: null, probationEndDate: null,
    basicMonthly: pkg.basic,
    allowances: pkg.allowances.map((a) => ({ ...a })) },
  absences: [], overtime: [], loans: [], restDayWork: [] };
  return national ? payslipWithoutPension(input).value
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS).value;
}

/** The cost of one planned hire: monthly, first year, and the budget. */
export function hireCostPreview(c: DemoCompany, input: HireInput)
  : HirePreview {
  const role = hireRoles(c).find((r) => r.jobKey === input.jobKey) ?? null;
  const problems: string[] = [];
  if (role === null) problems.push("Choose a role.");
  else if (input.grade < role.gradeMin || input.grade > role.gradeMax) {
    problems.push(`${role.title} is graded ${role.gradeMin} to ` +
      `${role.gradeMax}. Choose a grade in that range.`);
  }
  if (!isoOk(input.startIso)) problems.push("Enter a start date.");
  else if (input.startIso <= AS_OF) {
    problems.push(`The start date must be after ${shortDateText(AS_OF)}.`);
  } else if (input.startIso > HIRE_LATEST_START) {
    problems.push(`The preview runs to ${shortDateText(HIRE_LATEST_START)}.`);
  }
  const empty: HirePreview = { problems, role, national: input.national,
    startText: isoOk(input.startIso) ? shortDateText(input.startIso) : "",
    basicText: "", allowances: [], monthlyGross: fils(0n), months: [],
    firstYearGross: fils(0n), employer: { status: "not-computed",
      note: HIRE_EMPLOYER_NOTE }, placeholders: [],
    placeholdersTotal: fils(0n), firstYearTotal: fils(0n), budget: null,
    basis: HIRE_BASIS };
  if (problems.length > 0 || role === null) return empty;

  const pkg = hirePackage(input.grade);
  const template = c.employees.find((e) => e.cases.length === 0)!;
  const y0 = Number(input.startIso.slice(0, 4));
  const m0 = Number(input.startIso.slice(5, 7));
  const months: HireMonth[] = Array.from({ length: 12 }, (_, i) => {
    const total = (m0 - 1) + i;
    const year = y0 + Math.floor(total / 12);
    const month = (total % 12) + 1;
    const r = slip(template, pkg, input.startIso, input.national, year,
      month);
    return { month: `${year}-${pad(month)}`,
      label: reportMonth(`${year}-${pad(month)}`), gross: r.gross,
      part: i === 0 && Number(input.startIso.slice(8, 10)) > 1 };
  });
  const full = slip(template, pkg, "2000-01-01", input.national, y0, m0);
  const employerAll = months.map((_, i) => {
    const total = (m0 - 1) + i;
    return slip(template, pkg, input.startIso, input.national,
      y0 + Math.floor(total / 12), (total % 12) + 1).employerCost;
  });
  const employerSum = sum(employerAll);
  const employer: HirePreview["employer"] = input.national
    ? { status: "not-computed", note: HIRE_PENSION_NOTE }
    : employerSum > 0n ? { status: "computed", amount: fils(employerSum) }
      : { status: "not-computed", note: HIRE_EMPLOYER_NOTE };
  const placeholders = HIRE_PLACEHOLDERS.filter((p) =>
    !(input.national && p.foreignOnly)).map((p) => ({ label: p.label,
    amount: p.amount, note: p.note }));
  const placeholdersTotal = fils(sum(placeholders.map((p) => p.amount)));
  const firstYearGross = fils(sum(months.map((m) => m.gross)));
  const inYear = fils(sum(months.filter((m) =>
    m.month.startsWith(String(HIRE_YEAR))).map((m) => m.gross)));
  const plan = workforcePlan(c).rows.find((r) =>
    r.departmentId === role.departmentId)!;
  return { ...empty, problems: [], basicText: formatAed(pkg.basic),
    allowances: pkg.allowances.map((a) => ({ label: ALLOWANCE_TEXT[a.code]
      ?? a.code, monthly: a.monthly })), monthlyGross: full.gross, months,
  firstYearGross, employer, placeholders, placeholdersTotal,
  firstYearTotal: fils(firstYearGross + (employer.status === "computed"
    ? employer.amount : 0n) + placeholdersTotal),
  budget: { departmentId: role.departmentId,
    departmentText: role.departmentText, year: HIRE_YEAR,
    planned: plan.budget.total, hireInYear: inYear,
    withHire: fils(plan.budget.total + inYear),
    unpricedSeats: plan.unpriced,
    basis: `${HIRE_YEAR} payroll budget from Workforce planning: gross ` +
      `pay only, an estimate. ${plural(plan.unpriced, "open seat",
        "open seats")} with no accepted offer ` +
      `${plan.unpriced === 1 ? "is" : "are"} not priced in it.` } };
}

// ---------------------------------------------------------------
// Report templates library (X12)
// ---------------------------------------------------------------

export type TemplateFilter = "none" | "month" | "department";

export interface ReportTemplate {
  id: string;
  title: string;
  /** The question it answers, one line. */
  asks: string;
  /** The existing report it opens (a registry area id). */
  areaId: string;
  filter: TemplateFilter;
  filterLabel: string;
}

export const REPORT_TEMPLATES: readonly ReportTemplate[] = [
  { id: "payroll-summary", title: "Payroll summary",
    asks: "What does this month's run come to, against last month?",
    areaId: "reports.summary", filter: "none", filterLabel: "" },
  { id: "variance", title: "Variance",
    asks: "Why did pay move against the month before?",
    areaId: "reports.variance", filter: "month", filterLabel: "Month" },
  { id: "headcount", title: "Headcount",
    asks: "Who joined and who left, and what is turnover?",
    areaId: "reports.headcount", filter: "none", filterLabel: "" },
  { id: "cost-centre", title: "Cost centre",
    asks: "How does one department's pay compare with its budget?",
    areaId: "reports.cost-budget", filter: "department",
    filterLabel: "Cost centre" },
  { id: "leave-liability", title: "Leave liability",
    asks: "What is owed for unused leave days?",
    areaId: "time.liability", filter: "none", filterLabel: "" },
  { id: "wps-check", title: "Salary file check",
    asks: "What went in the salary file, and what was held back?",
    areaId: "reports.files", filter: "none", filterLabel: "" },
];

export interface TemplateChoices {
  months: { value: string; label: string }[];
  departments: { value: string; label: string }[];
}

/** The options a template's filter can take (from the data). */
export function templateChoices(c: DemoCompany): TemplateChoices {
  return { months: payrollHistory(c).slice(1).map((m) => ({
    value: m.month, label: reportMonth(m.month) })).reverse(),
  departments: c.departments.map((d) => ({ value: d.id,
    label: departmentText(d.id) })) };
}

/** A saved view's name: "Variance, Oct 2026". */
export function templateViewName(t: ReportTemplate, filterText: string)
  : string {
  return filterText === "" ? t.title : `${t.title}, ${filterText}`;
}

export const TEMPLATE_BASIS = "A template opens the report that already " +
  "exists, set to the month or cost centre you pick. Your saved views " +
  "stay in this demo only.";
