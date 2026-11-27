import {
  addDays,
  calculateSettlement,
  fils,
  formatAed,
  GRATUITY_PACKS,
  type Fils,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural } from "./display";
import { PENSION_NOT_COMPUTED } from "./pension";
import { BASIC_STEP, GRADE_BASIC, GRADE_TRANSPORT } from "./roster-data";
import type { DemoCompany, DemoEmployee, DocumentKind } from "./types";
import { departmentText, jobTitleText, shortDateText } from "./wp3";
import { ACCESS_ROLES, APPROVAL_RULES, EXPENSE_LIMIT } from "./wp9";

/**
 * WPD structure: the Setup lists a bank HR manager and the IT manager
 * open first. FICTIONAL. Jobs, grades, document types, approval levels
 * and payroll exclusions, all derived from the roster, the rules and
 * the engine; nothing here is typed per person, so every seed agrees.
 * Unlocks map rows S01, S02, S05 and S17.
 */

const sameFils = (n: bigint): Fils => fils(n);

/* ---------------------------------------------------------------- *
 * S01 Jobs and grades
 * ---------------------------------------------------------------- */

export interface GradeBand {
  grade: number;
  basicMin: Fils;
  basicMax: Fils;
  transport: Fils;
  headcount: number;
  display: { band: string; transport: string; headcount: string };
}

/** The bands the roster draws basic pay from: floor to floor plus 8 steps. */
export function gradeBands(c: DemoCompany): GradeBand[] {
  return Object.keys(GRADE_BASIC).map(Number).sort((a, b) => a - b)
    .map((grade) => {
      const min = GRADE_BASIC[grade]!;
      const max = min + BASIC_STEP * 8n;
      const n = c.employees.filter((e) => e.grade === grade).length;
      return { grade, basicMin: sameFils(min), basicMax: sameFils(max),
        transport: sameFils(GRADE_TRANSPORT[grade]!), headcount: n,
        display: { band: `${formatAed(sameFils(min))} to ` +
          formatAed(sameFils(max)), transport:
          formatAed(sameFils(GRADE_TRANSPORT[grade]!)),
        headcount: plural(n, "person", "people") } };
    });
}

export interface JobView {
  jobKey: string;
  title: string;
  departmentIds: string[];
  departmentText: string;
  gradeMin: number;
  gradeMax: number;
  holderIds: string[];
  display: { grades: string; headcount: string; band: string };
}

/** One row per job title in use, with its grades and holders. */
export function jobCatalogue(c: DemoCompany): JobView[] {
  const keys = [...new Set(c.employees.map((e) => e.jobKey))];
  return keys.map((jobKey) => {
    const people = c.employees.filter((e) => e.jobKey === jobKey);
    const grades = people.map((e) => e.grade);
    const lo = Math.min(...grades);
    const hi = Math.max(...grades);
    const depts = [...new Set(people.map((e) => e.departmentId))];
    const band = `${formatAed(sameFils(GRADE_BASIC[lo]!))} to ` +
      formatAed(sameFils(GRADE_BASIC[hi]! + BASIC_STEP * 8n));
    return { jobKey, title: jobTitleText(jobKey), departmentIds: depts,
      departmentText: depts.map(departmentText).join(", "),
      gradeMin: lo, gradeMax: hi, holderIds: people.map((e) => e.id),
      display: { grades: lo === hi ? `Grade ${lo}`
        : `Grades ${lo} to ${hi}`, headcount: plural(people.length,
        "person", "people"), band } };
  });
}

/* ---------------------------------------------------------------- *
 * S02 Document types
 * ---------------------------------------------------------------- */

export interface DocumentTypeView {
  id: string;
  kind: DocumentKind | "employment-contract" | "qualification-record";
  label: string;
  tracksExpiry: boolean;
  appliesTo: string;
  reminderDays: number[];
  onFile: number;
  expiringSoon: number;
  display: { reminders: string; onFile: string };
}

/** The reminder windows the expiry states use (see expiryState). */
export const EXPIRY_REMINDER_DAYS: readonly number[] = [90, 30];

const TYPE_DEFS: readonly { kind: DocumentTypeView["kind"]; label: string;
  tracks: boolean; appliesTo: string }[] = [
  { kind: "residence-visa", label: "Residence visa", tracks: true,
    appliesTo: "Expatriate staff" },
  { kind: "emirates-id", label: "Emirates ID", tracks: true,
    appliesTo: "All staff" },
  { kind: "passport", label: "Passport", tracks: true,
    appliesTo: "All staff" },
  { kind: "employment-contract", label: "Employment contract",
    tracks: false, appliesTo: "All staff" },
  { kind: "qualification-record", label: "Qualification record",
    tracks: false, appliesTo: "All staff" },
];

export function documentTypes(c: DemoCompany): DocumentTypeView[] {
  return TYPE_DEFS.map((t) => {
    const docs = c.documents.filter((d) => d.kind === t.kind);
    const soon = docs.filter((d) => d.state === "expiring-30" ||
      d.state === "expiring-90" || d.state === "expired").length;
    return { id: `dt-${t.kind}`, kind: t.kind, label: t.label,
      tracksExpiry: t.tracks, appliesTo: t.appliesTo,
      reminderDays: t.tracks ? [...EXPIRY_REMINDER_DAYS] : [],
      onFile: docs.length, expiringSoon: soon,
      display: { reminders: t.tracks ? "Reminders at 90 and 30 days " +
        "before it ends" : "No end date to track",
      onFile: docs.length === 0 ? "No copies on file"
        : plural(docs.length, "copy", "copies") + " on file" } };
  });
}

/** The date a reminder fires for a document, from its end date. */
export const reminderDates = (expiresOn: string): string[] =>
  EXPIRY_REMINDER_DAYS.map((d) => addDays(expiresOn, -d));

/* ---------------------------------------------------------------- *
 * S05 Request approval levels (sign-off levels)
 * ---------------------------------------------------------------- */

export interface SignOffStep { step: number; roleId: string;
  roleText: string; who: string; action: "prepares" | "decides" }

export interface SignOffLevel {
  ruleId: string;
  label: string;
  threshold: Fils | null;
  steps: SignOffStep[];
  text: string;
  display: { threshold: string; route: string };
}

const roleLabel = (id: string): string =>
  ACCESS_ROLES.find((r) => r.id === id)!.label;

function holder(c: DemoCompany, roleId: string): string {
  if (roleId === "line-manager") return "The person's line manager";
  if (roleId === "general-manager") {
    const e = c.employees.find((x) => x.jobKey === "general-manager")!;
    return e.fullName;
  }
  const e = c.employees.find((x) => x.jobKey === roleId)!;
  return e.fullName;
}

/**
 * The sign-off levels, one per rule in APPROVAL_RULES (never typed a
 * second time). The pay run has two steps: HR prepares, the General
 * manager signs off, never the same person.
 */
export function signOffLevels(c: DemoCompany): SignOffLevel[] {
  const hr = c.employees.find((e) => e.jobKey === "hr-manager")!;
  return APPROVAL_RULES.map((r) => {
    const steps: SignOffStep[] = [];
    if (r.id === "pay-run") {
      steps.push({ step: 1, roleId: "hr-manager",
        roleText: roleLabel("hr-manager"), who: hr.fullName,
        action: "prepares" });
    }
    steps.push({ step: steps.length + 1, roleId: r.roleId,
      roleText: roleLabel(r.roleId), who: holder(c, r.roleId),
      action: "decides" });
    const threshold = r.id === "expense-large" ? EXPENSE_LIMIT
      : r.id === "expense-small" ? EXPENSE_LIMIT : null;
    return { ruleId: r.id, label: r.label, threshold, steps,
      text: r.text.replace(/\bapproves\b/g, "signs off")
        .replace(/\bapproved\b/g, "signed off"),
      display: { threshold: threshold === null ? "No amount limit"
        : (r.id === "expense-small" ? "Up to " : "Over ") +
          formatAed(threshold),
      route: steps.map((s) => `${s.who} ${s.action}`).join(", then ") } };
  });
}

/* ---------------------------------------------------------------- *
 * S17 Payroll exemptions (people and elements left out or held)
 * ---------------------------------------------------------------- */

export type ExclusionKind = "not-applicable" | "not-computed" |
  "held-out" | "outside-run" | "probation";

export interface PayrollExclusion {
  id: string;
  employeeId: string;
  name: string;
  element: string;
  kind: ExclusionKind;
  reason: string;
  source: "Payroll rules" | "Check";
  display: { who: string; element: string; since: string };
}

const gratuityOutcome = (e: DemoEmployee) => calculateSettlement({
  gratuity: { joiningDate: e.joiningDate, lastWorkingDate: AS_OF,
    unpaidLeaveDays: 0, lastBasicMonthly: e.basicMonthly,
    workerClass: e.workerClass }, unusedLeaveDays: 0 },
GRATUITY_PACKS).value;

/**
 * What the October run leaves out, and why. Each row is read from the
 * data: the pension line, the engine's gratuity outcome, the payslip
 * held for a missing IBAN, the leaver's settlement and probation sick
 * pay. No overtime exemption exists: the IT manager is paid night
 * overtime in October.
 */
export function payrollExclusions(c: DemoCompany): PayrollExclusion[] {
  const out: PayrollExclusion[] = [];
  const add = (e: DemoEmployee, element: string, kind: ExclusionKind,
    reason: string, source: PayrollExclusion["source"], since: string) =>
    out.push({ id: `ex-${String(out.length + 1).padStart(3, "0")}`,
      employeeId: e.id, name: e.fullName, element, kind, reason, source,
      display: { who: `${e.fullName}, ${jobTitleText(e.jobKey)}`,
        element, since } });
  const emps = new Map(c.employees.map((e) => [e.id, e]));
  for (const s of c.payRun.payslips) {
    const e = emps.get(s.employeeId)!;
    if (s.pension !== null) {
      add(e, "Pension", "not-computed", PENSION_NOT_COMPUTED.en,
        "Payroll rules", "Every pay run until the fund is confirmed");
      const g = gratuityOutcome(e);
      add(e, "End-of-service gratuity", "not-applicable", g.reason,
        "Payroll rules", `Joined ${shortDateText(e.joiningDate)}`);
    }
    if (!s.sif.included) {
      add(e, "Salary file", "held-out", s.sif.reason,
        "Check", `Held in the ${monthName(c)} run`);
    }
    if (e.cases.includes("probation") && s.payslip.unpaidDays > 0) {
      add(e, "Sick leave pay", "probation", "A sick day inside " +
        "probation is unpaid, as the leave rules say.",
      "Payroll rules", `Probation ends ${shortDateText(e.probationEndDate!)}`);
    }
  }
  for (const st of c.payRun.settlements) {
    const e = emps.get(st.employeeId)!;
    add(e, "October pay run", "outside-run", "Left the company on " +
      `${shortDateText(e.leavingDate!)}; the final settlement is paid ` +
      "outside the pay run and the salary file.", "Check",
    shortDateText(e.leavingDate!));
  }
  return out;
}

const monthName = (c: DemoCompany): string =>
  ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"]
    [c.payRun.month - 1]!;

/** Staff paid overtime in the October run, with grade: no group rule. */
export function overtimePaidStaff(c: DemoCompany): { employeeId: string;
  name: string; grade: number; jobText: string; amount: Fils;
  display: { amount: string } }[] {
  return c.payRun.payslips.flatMap((s) => {
    const ot = s.payslip.earnings.filter((l) => l.kind === "overtime");
    if (ot.length === 0) return [];
    const e = c.employees.find((x) => x.id === s.employeeId)!;
    const amount = fils(ot.reduce((n, l) => n + l.amount, 0n));
    return [{ employeeId: e.id, name: e.fullName, grade: e.grade,
      jobText: jobTitleText(e.jobKey), amount,
      display: { amount: formatAed(amount) } }];
  });
}
