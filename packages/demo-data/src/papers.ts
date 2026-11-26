/**
 * WP4 People papers: letters, the staff request queue, visa and
 * government cases, and warnings. Records only: nothing here moves
 * money; amounts quoted are contract figures, summed.
 */
import { daysBetween, fils, formatAed, type Fils } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { dateOf, displayDate, plural, type DisplayDate } from "./display";
import type { FakeIdentifier } from "./fake-ids";
import type { DemoCompany, DemoEmployee } from "./types";

const nameOf = (c: DemoCompany, id: string) =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;
const ref = (prefix: string, n: number): FakeIdentifier => ({
  value: `ZB-${prefix}-2026-${String(n).padStart(4, "0")}`,
  masked: `ZB-${prefix}-2026-****`, fake: true,
  note: "Fake: a reference of the fictional bank" });

/** Basic plus allowances as in the contract (a sum, not a payslip). */
const contractSalary = (e: DemoEmployee): Fils => fils(e.basicMonthly +
  e.allowances.reduce((n, a) => n + a.monthly, 0n));

export type LetterKind = "salary-certificate" | "noc" | "experience";

export interface DemoLetter { id: string; kind: LetterKind;
  employeeId: string; requestedOn: string; status: "issued" | "pending" |
    "draft"; purpose: string; addressee: string;
  reference: FakeIdentifier; monthlySalary: Fils | null;
  display: { name: string; kind: string; requested: string;
    salary: string; status: string } }

const LETTER_KIND: Record<LetterKind, string> = {
  "salary-certificate": "Salary certificate", noc: "No-objection letter",
  experience: "Experience letter" };
const STATUS: Record<string, string> = { issued: "Issued",
  pending: "Waiting for HR", draft: "Draft", open: "Open",
  "in-progress": "In progress", done: "Done", "to-start": "To start",
  completed: "Completed", closed: "Closed" };

const LETTERS: [string, LetterKind, string, DemoLetter["status"],
  string, string][] = [
  ["emp-012", "salary-certificate", "2026-10-20", "issued",
    "Personal loan application", "Demo Bank (fictional)"],
  ["emp-024", "salary-certificate", "2026-10-26", "pending",
    "Tenancy contract", "Demo Properties (fictional)"],
  ["emp-002", "noc", "2026-10-23", "pending",
    "Travel visa application", "To whom it may concern"],
  ["emp-014", "experience", "2026-10-15", "draft",
    "End of service", "To whom it may concern"],
];

/** Letters requested and issued (salary certificate, NOC, experience). */
export function letters(c: DemoCompany): DemoLetter[] {
  return LETTERS.map(([id, kind, on, status, purpose, addressee], i) => {
    const e = c.employees.find((x) => x.id === id)!;
    const salary = kind === "salary-certificate" ? contractSalary(e)
      : null;
    return { id: `lt-${i + 1}`, kind, employeeId: id, requestedOn: on,
      status, purpose, addressee, reference: ref("LTR", 140 + i),
      monthlySalary: salary, display: { name: e.fullName,
        kind: LETTER_KIND[kind], requested: displayDate(on),
        salary: salary === null ? "" : `${formatAed(salary)} a month, ` +
          "as per contract", status: STATUS[status]! } };
  });
}

export interface StaffRequest { id: string; kind: string; title: string;
  employeeId: string; raisedOn: string; status: "open" | "in-progress" |
    "done"; assignedTo: string; linksTo: string | null;
  display: { name: string; raised: string; waiting: string;
    status: string; assignedTo: string } }

const REQUESTS: [string, string, string, string, StaffRequest["status"],
  string | null][] = [
  ["bank-details", "Update bank details", "emp-023", "2026-10-26",
    "open", "enter-iban"],
  ["letter", "No-objection letter for travel", "emp-002", "2026-10-23",
    "open", "lt-3"],
  ["letter", "Salary certificate for a tenancy", "emp-024", "2026-10-26",
    "in-progress", "lt-2"],
  ["air-ticket", "Air ticket for annual leave", "emp-031", "2026-10-19",
    "in-progress", null],
  ["profile-change", "Change of home address", "emp-021", "2026-10-22",
    "open", null],
  ["salary-advance", "Salary advance", "emp-018", "2026-10-20", "done",
    "ADV-1007"],
];

/** The HR queue of staff requests (assigned to the HR officer). */
export function staffRequests(c: DemoCompany): StaffRequest[] {
  const hr = "emp-029";
  return REQUESTS.map(([kind, title, id, on, status, linksTo], i) => ({
    id: `rq-${i + 1}`, kind, title, employeeId: id, raisedOn: on, status,
    assignedTo: hr, linksTo, display: { name: nameOf(c, id),
      raised: displayDate(on), waiting: status === "done" ? ""
        : plural(daysBetween(on, AS_OF), "day", "days"),
      status: STATUS[status]!,
      assignedTo: nameOf(c, hr) } }));
}

export interface CaseStage { label: string; date: string | null;
  done: boolean; display: string }

export interface VisaCase { id: string; employeeId: string;
  kind: string; expiresOn: string | null; status: "in-progress" |
    "to-start" | "completed"; stages: CaseStage[]; feesNote: string;
  display: { name: string; kind: string; expires: string;
    status: string } }

const stage = (label: string, date: string | null, done: boolean)
  : CaseStage => ({ label, date, done, display: date === null
  ? `${label}: not booked` : `${label}: ${displayDate(date)}${done
    ? "" : " (booked)"}` });

const FEES = "Government fees are not shown: the demo has no fee " +
  "schedule.";

/** Visa and Emirates ID cases, tied to the documents near expiry. */
export function visaCases(c: DemoCompany): VisaCase[] {
  const doc = (kind: string) => c.documents.find((d) => d.kind === kind &&
    d.daysLeft <= 30)!;
  const visa = doc("residence-visa");
  const eid = doc("emirates-id");
  const mk = (id: string, employeeId: string, kind: string,
    expiresOn: string | null, status: VisaCase["status"],
    stages: CaseStage[]): VisaCase => ({ id, employeeId, kind, expiresOn,
    status, stages, feesNote: FEES, display: { name: nameOf(c,
      employeeId), kind, expires: expiresOn === null ? ""
      : displayDate(expiresOn), status: STATUS[status]! } });
  return [
    mk("vc-1", visa.employeeId, "Residence visa renewal", visa.expiresOn,
      "in-progress", [stage("Application submitted", "2026-10-15", true),
        stage("Medical fitness test", "2026-10-21", true),
        stage("Emirates ID biometrics", "2026-10-29", false),
        stage("Visa stamping", null, false)]),
    mk("vc-2", eid.employeeId, "Emirates ID renewal", eid.expiresOn,
      "to-start", [stage("Renewal application", null, false)]),
    mk("vc-3", "emp-009", "New employment visa", null, "completed", [
      stage("Entry permit", "2026-09-10", true),
      stage("Medical fitness test", "2026-10-07", true),
      stage("Emirates ID biometrics", "2026-10-12", true),
      stage("Residence visa stamped", "2026-10-19", true)]),
  ];
}

export interface DemoWarning { id: string; employeeId: string;
  level: string; reasonKind: "late-arrival" | "conduct"; reason: string;
  status: "draft" | "closed"; issuedBy: string; evidence: DisplayDate[];
  deductionNote: string;
  display: { name: string; issuedBy: string; status: string } }

const NO_DEDUCTION = "No deduction: the demo records warnings only; any " +
  "penalty is not computed.";

/** Days someone arrived after 08:15, from the attendance records. */
function lateDays(c: DemoCompany, id: string): DisplayDate[] {
  return c.attendance.filter((d) => d.employeeId === id &&
    d.clockIn !== null && Number(d.clockIn.slice(11, 13)) * 60 +
      Number(d.clockIn.slice(14, 16)) > 8 * 60 + 15)
    .map((d) => dateOf(d.date));
}

/** Warnings: a draft built from attendance, and a closed verbal one. */
export function warnings(c: DemoCompany): DemoWarning[] {
  const late = lateDays(c, "emp-008");
  const mk = (w: Omit<DemoWarning, "display" | "deductionNote">)
    : DemoWarning => ({ ...w, deductionNote: NO_DEDUCTION, display: {
    name: nameOf(c, w.employeeId), issuedBy: nameOf(c, w.issuedBy),
    status: STATUS[w.status]! } });
  return [
    mk({ id: "wr-1", employeeId: "emp-008", level: "First written " +
      "warning", reasonKind: "late-arrival", reason: `Late on ` +
      `${late.length} days in October (${late.map((d) => d.display)
        .join(", ")}).`, status: "draft", issuedBy: "emp-028",
    evidence: late }),
    mk({ id: "wr-2", employeeId: "emp-020", level: "Verbal warning",
      reasonKind: "conduct", reason: "Archive room left unlocked after " +
        "hours.", status: "closed", issuedBy: "emp-016",
      evidence: [dateOf("2026-08-12")] }),
  ];
}
