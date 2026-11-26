import { addDays, daysBetween, formatAed, type Fils } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { issuesOf } from "./issues";
import { payCorrections } from "./pay";
import { employeeById } from "./selectors";
import type { DemoCompany } from "./types";
import { ACCESS_PERMISSIONS, ACCESS_ROLES } from "./wp9";
import { jobTitleText } from "./wp3";
import { signOffReport } from "./wpe-payroll-extras";
import { policies } from "./wpe-safety";
import {
  auditEvents,
  payrollHistory,
  reportDate,
  reportMonth,
  verifyAuditChain,
} from "./wp7";

/**
 * WPE audit: the outside auditor's access (S25), the inspection pack
 * (X33) and the error-remedy record (X37). FICTIONAL. The external
 * auditor is not an employee, so this person is not one of the 12
 * users in wp9; the Setup screens merge the two lists. Every figure is
 * read from the payroll history, the sign-offs, the audit chain and
 * the policies; nothing here is saved, sent or filed anywhere.
 */

export const NOT_A_FILING = "This pack is evidence your company can " +
  "hand to an inspector. It is not a filing with any authority, and " +
  "nothing in it has been sent to one.";

/** Sample ceiling for an auditor's window. To confirm with the client. */
export const AUDITOR_MAX_DAYS = 90;
export const AUDITOR_MAX_NOTE = `Sample limit: ${AUDITOR_MAX_DAYS} days. ` +
  "To confirm with your own policy.";

/* ---------------------------------------------------------------- *
 * S25 Auditor access
 * ---------------------------------------------------------------- */

export interface AuditorSample {
  id: string;
  name: string;
  firm: string;
  email: string;
  roleId: string;
  roleLabel: string;
  /** What the role lets the auditor open, from the role's permissions. */
  can: string[];
  cannot: string[];
  /** The access window the engagement letter asks for (ISO). */
  fromIso: string;
  toIso: string;
  /** The pay months the auditor is to look at. */
  scope: string;
  display: { from: string; to: string; window: string };
}

const AUDITOR_ID = "ext-auditor-001";

export function auditorSample(_c: DemoCompany): AuditorSample {
  const role = ACCESS_ROLES.find((r) => r.id === "auditor")!;
  const can = ACCESS_PERMISSIONS.filter((p) => role.permissions
    .includes(p.id) && p.id !== "self.view-own").map((p) => p.label);
  const toIso = addDays(AS_OF, 31);
  return { id: AUDITOR_ID, name: "Hana Rostami",
    firm: "Gulf Ledger Assurance (sample firm)",
    email: "hana.rostami@gulfledger.example.test", roleId: role.id,
    roleLabel: role.label, can,
    cannot: ["Change any record or setting", "Run, sign off or send a pay " +
      "run", "See anyone's salary history or bank details",
    "Add or remove people's access"],
    fromIso: AS_OF, toIso,
    scope: "Pay months January to October 2026",
    display: { from: reportDate(AS_OF), to: reportDate(toIso),
      window: `${daysBetween(AS_OF, toIso)} days` } };
}

export type AuditorStatus = "scheduled" | "active" | "expired";

export function auditorStatus(fromIso: string, toIso: string,
  today: string = AS_OF): AuditorStatus {
  if (today < fromIso) return "scheduled";
  return today > toIso ? "expired" : "active";
}

export const AUDITOR_STATUS_TEXT: Record<AuditorStatus, string> = {
  scheduled: "Not started", active: "Active", expired: "Expired" };

/** A sentence if the window cannot be granted, else null. */
export function auditorWindowProblem(fromIso: string, toIso: string,
  today: string = AS_OF): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toIso)) {
    return "Choose the day the access ends. Every auditor's access must " +
      "end on a date.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso)) {
    return "Choose the day the access starts.";
  }
  if (toIso < today) return "That end day has already passed. Choose a " +
    "day from today onward.";
  if (toIso < fromIso) return "The end day is before the start day.";
  if (daysBetween(fromIso, toIso) > AUDITOR_MAX_DAYS) {
    return `Longer than the sample limit of ${AUDITOR_MAX_DAYS} days. ` +
      "Choose an earlier end day.";
  }
  return null;
}

export const auditorWindowText = (fromIso: string, toIso: string): string =>
  `${reportDate(fromIso)} to ${reportDate(toIso)}`;

/** What an auditor may open in the room, for the view log. */
export const AUDITOR_PAGES: readonly { id: string; label: string }[] = [
  { id: "pack", label: "Inspection pack" },
  { id: "errors", label: "Error-remedy record" },
  { id: "trail", label: "Audit trail" },
];

/* ---------------------------------------------------------------- *
 * X33 Inspection pack, one page per month
 * ---------------------------------------------------------------- */

export interface InspectionMonth { key: string; label: string;
  statusText: string }

export function inspectionMonths(c: DemoCompany): InspectionMonth[] {
  return payrollHistory(c).map((m) => ({ key: m.month,
    label: reportMonth(m.month), statusText: m.status === "paid"
      ? "Paid" : "Waiting for sign-off" }));
}

export interface RegisterLine { number: string; name: string; gross: Fils;
  net: Fils; display: { gross: string; net: string } }

export interface PackSignOff { id: string; kindText: string;
  subject: string; askedBy: string; askedOn: string; decider: string;
  decidedOn: string; outcomeText: string }

export interface PackFile { id: string; name: string; what: string;
  who: string; when: string }

export interface PackException { id: string; title: string;
  reason: string; severityText: string; statusText: string }

export interface PackPolicy { id: string; name: string; version: string;
  inForceFrom: string; owner: string }

export interface InspectionPack {
  month: string;
  title: string;
  statusText: string;
  register: { headcount: number; gross: Fils; deductions: Fils; net: Fils;
    lines: RegisterLine[];
    display: { headcount: string; gross: string; deductions: string;
      net: string } };
  signOffs: PackSignOff[];
  files: PackFile[];
  exceptions: PackException[];
  chain: { ok: boolean; checked: number; inMonth: number;
    text: string; headShort: string; headOn: string };
  policies: PackPolicy[];
  note: string;
}

const monthEnd = (key: string): string => {
  const [y = 0, m = 1] = key.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1)
    .padStart(2, "0")}-01`;
  return addDays(next, -1);
};

const stampOf = (at: string): string =>
  `${reportDate(at.slice(0, 10))}, ${at.slice(11, 16)}`;

const shorten = (h: string): string => `${h.slice(0, 8)}...${h.slice(-4)}`;

function packSignOffs(c: DemoCompany, month: string): PackSignOff[] {
  return signOffReport(c).filter((r) => r.sortKey.startsWith(month) ||
    (r.outcome === "waiting" && r.sortKey.slice(0, 7) === month))
    .map((r) => ({ id: r.id, kindText: r.kindText, subject: r.subject,
      askedBy: r.askedBy, askedOn: r.askedOn, decider: r.decider,
      decidedOn: r.decidedOn === "" ? "Not yet" : r.decidedOn,
      outcomeText: r.outcomeText }));
}

function packFiles(c: DemoCompany, month: string): PackFile[] {
  return auditEvents(c).filter((e) => /^wps\./.test(e.action) &&
    (e.subject.id === `run-${month}` ||
      (month === "2026-10" && e.subject.kind === "sif")))
    .map((e) => ({ id: e.id, name: e.subject.label,
      what: e.action === "wps.file-created" ? "Salary file created"
        : "Salary file marked as sent to the bank",
      who: e.actorId === null ? "The system"
        : employeeById(c, e.actorId).fullName, when: stampOf(e.at) }));
}

function packExceptions(c: DemoCompany, month: string): PackException[] {
  const out: PackException[] = [];
  if (month === "2026-10") {
    for (const i of issuesOf(c).filter((x) => x.kind === "issue")) {
      out.push({ id: `exc-${i.code}-${i.employeeId ?? i.subjectId ?? ""}`,
        title: i.title, reason: i.plainReason.en,
        severityText: i.severity === "error" ? "Stops pay" : "Check",
        statusText: "Open: fix before the run is signed off" });
    }
  }
  for (const k of payCorrections(c)) {
    if (`2026-${String(k.month).padStart(2, "0")}` !== month) continue;
    out.push({ id: `exc-${k.id}`, title: `Correction for ${k.display.name}`,
      reason: REMEDY[k.id]!.what, severityText: "Check",
      statusText: `Corrected later: ${k.display.amount} to be paid in the ` +
        `${k.payIn} run` });
  }
  return out;
}

function packPolicies(c: DemoCompany, month: string): PackPolicy[] {
  const end = monthEnd(month);
  return policies(c).map((p) => {
    const all = [{ version: p.version, effectiveOn: p.effectiveOn },
      ...p.history].sort((a, b) => b.effectiveOn.iso.localeCompare(
      a.effectiveOn.iso));
    const inForce = all.find((v) => v.effectiveOn.iso <= end);
    return { p, inForce };
  }).filter((x) => x.inForce !== undefined).map(({ p, inForce }) => ({
    id: p.id, name: p.name, version: `Version ${inForce!.version}`,
    inForceFrom: inForce!.effectiveOn.display,
    owner: `${p.ownerName}, ${p.ownerRole}` }));
}

/** One month's evidence, or null for a month the data does not hold. */
export function inspectionPack(c: DemoCompany, month: string)
  : InspectionPack | null {
  const m = payrollHistory(c).find((x) => x.month === month);
  if (m === undefined) return null;
  const events = auditEvents(c);
  const check = verifyAuditChain(events);
  const end = monthEnd(month);
  const upTo = events.filter((e) => e.at.slice(0, 10) <= end);
  const head = upTo.at(-1) ?? events[0]!;
  const inMonth = events.filter((e) => e.at.slice(0, 7) === month).length;
  const lines = m.lines.map((l): RegisterLine => {
    const e = employeeById(c, l.employeeId);
    return { number: e.number, name: e.fullName, gross: l.gross,
      net: l.net, display: { gross: formatAed(l.gross),
        net: formatAed(l.net) } };
  });
  return { month, title: `Inspection pack, ${reportMonth(month)}`,
    statusText: m.status === "paid" ? "Paid" : "Waiting for sign-off",
    register: { headcount: m.headcount, gross: m.gross,
      deductions: m.deductions, net: m.net, lines, display: {
        headcount: `${m.headcount} people`, gross: formatAed(m.gross),
        deductions: formatAed(m.deductions), net: formatAed(m.net) } },
    signOffs: packSignOffs(c, month), files: packFiles(c, month),
    exceptions: packExceptions(c, month),
    chain: { ok: check.ok, checked: check.checked, inMonth,
      text: check.ok ? `Chain checked: all ${check.checked} entries fit. ` +
        `${inMonth} of them are from ${reportMonth(month)}.`
        : `Chain broken at entry ${check.brokenAt}.`,
      headShort: shorten(head.hash),
      headOn: stampOf(head.at) },
    policies: packPolicies(c, month), note: NOT_A_FILING };
}

/* ---------------------------------------------------------------- *
 * X37 Error-remedy record
 * ---------------------------------------------------------------- */

export interface ErrorRemedy {
  id: string;
  personName: string;
  monthText: string;
  source: string;
  what: string;
  foundBy: string;
  foundOn: string;
  fix: string;
  amount: Fils | null;
  paidIn: string;
  open: boolean;
  statusText: string;
}

/** What went wrong, in words, and who found it (sample entries). */
const REMEDY: Record<string, { what: string; job: string;
  foundOn: string }> = {
  "cor-001": { job: "hr-officer", foundOn: "2026-10-08",
    what: "Two days in July were recorded as unpaid leave in error; the " +
      "employee was at work." },
  "cor-002": { job: "hr-manager", foundOn: "2026-10-14",
    what: "Three hours of overtime on 17 September were signed off but " +
      "not paid." },
};

export const REMEDY_NOTE = "Who found each error and when are sample " +
  "entries for this demo; the audit trail does not record them. The " +
  "amounts are worked out by the pay engine.";

export function errorRemedies(c: DemoCompany): ErrorRemedy[] {
  const byJob = (job: string) => c.employees.find((e) =>
    e.jobKey === job && e.leavingDate === null)!;
  const fixed = payCorrections(c).map((k): ErrorRemedy => {
    const r = REMEDY[k.id]!;
    const who = byJob(r.job);
    return { id: k.id, personName: k.display.name,
      monthText: k.display.month, source: "Pay correction", what: r.what,
      foundBy: `${who.fullName}, ${jobTitleText(who.jobKey)}`,
      foundOn: reportDate(r.foundOn),
      fix: "The month is worked out again with the record put right; " +
        "the difference is added to a later run.", amount: k.amount,
      paidIn: `${k.payIn} run, not yet paid`, open: true,
      statusText: "To be paid in the " + k.payIn + " run" };
  });
  const back = c.payRun.backPay.map((b): ErrorRemedy => {
    const e = employeeById(c, b.employeeId);
    const who = byJob("hr-manager");
    return { id: `back-${b.employeeId}`, personName: e.fullName,
      monthText: "September 2026", source: "Raise entered late",
      what: "The raise from 1 September was entered on 5 October, after " +
        "September was paid.",
      foundBy: `${who.fullName}, ${jobTitleText(who.jobKey)}`,
      foundOn: reportDate("2026-10-05"),
      fix: "Back pay on the basic salary is added to the October run.",
      amount: b.amount, paidIn: "October run, waiting for sign-off",
      open: true, statusText: "In the October run" };
  });
  const found = issuesOf(c).filter((i) => i.kind === "issue" &&
    i.employeeId !== null).map((i): ErrorRemedy => {
    const e = employeeById(c, i.employeeId!);
    return { id: `file-${i.code}-${e.id}`, personName: e.fullName,
      monthText: "October 2026", source: "Salary file check",
      what: i.plainReason.en, foundBy: "The salary file check, by the " +
        "system", foundOn: reportDate(AS_OF), fix: i.suggestedFix.en,
      amount: null, paidIn: "Not paid until fixed", open: true,
      statusText: i.severity === "error" ? "Open: stops pay"
        : "Open: check" };
  });
  return [...found, ...fixed, ...back];
}
