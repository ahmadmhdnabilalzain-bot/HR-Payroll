import { formatAed, type PayslipFlag } from "@payroll/engine";
import type { Finding } from "@payroll/wps";
import {
  dateOf,
  duration,
  plural,
  possessive,
  whenText,
  type DisplayDate,
} from "./display";
import { FIX, GENERIC, type Bilingual, type FixKind } from "./issue-fixes";
import type { DemoCompany, DemoPayslip } from "./types";

export type { Bilingual, FixKind } from "./issue-fixes";

/**
 * issue: to fix before approving (counted). needs-confirmation: client
 * setup to confirm. note: context only (the invented bank's code).
 */
export type IssueKind = "issue" | "needs-confirmation" | "note";
export type IssueSeverity = "error" | "warning" | "info";

/** Who raised it: never text we made up about the data. */
export type IssueSource = "engine" | "sif-validator" | "sif-batch" |
  "documents" | "demo-scope";

/** Where a SIF finding sits in the file (lines as in the file text). */
export interface SifPlace { fileLine: number; record: "EDR" | "EVP" |
  "SCR"; edrNumber: number | null }

export interface DemoIssue {
  code: string;
  kind: IssueKind;
  severity: IssueSeverity;
  source: IssueSource;
  employeeId: string | null;
  subjectId: string | null;
  count: number;
  /** Short, sentence case. */
  title: string;
  /** A human sentence; no codes, raw dates or citations. */
  plainReason: Bilingual;
  suggestedFix: Bilingual;
  fixKind: FixKind;
  /** The date the reason talks about, readable and ISO. */
  date: DisplayDate | null;
  sif: SifPlace | null;
  /** The engine's or validator's own words, when it raised it. */
  raisedAs: string | null;
}

const AR_TBD = "";

type Make = Pick<DemoIssue, "code" | "source" | "employeeId" |
  "subjectId" | "title"> & { en: string; kind?: IssueKind;
  severity?: IssueSeverity; count?: number; date?: DisplayDate | null;
  sif?: SifPlace | null; raisedAs?: string | null; ar?: string };

function issue(x: Make): DemoIssue {
  const f = FIX[x.code] ?? GENERIC;
  return { code: x.code, kind: x.kind ?? "issue",
    severity: x.severity ?? "warning", source: x.source,
    employeeId: x.employeeId, subjectId: x.subjectId, count: x.count ?? 1,
    title: x.title, plainReason: { en: x.en, ar: x.ar ?? AR_TBD },
    suggestedFix: f.fix, fixKind: f.kind, date: x.date ?? null,
    sif: x.sif ?? null, raisedAs: x.raisedAs ?? null };
}

const nameOf = (c: DemoCompany, id: string) =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

function flagIssue(c: DemoCompany, s: DemoPayslip, f: PayslipFlag)
  : DemoIssue[] {
  // Deferrals are listed by deferred() with their amounts.
  if (f.code === "DEDUCTION_DEFERRED") return [];
  if (f.code !== "OVERTIME_DAILY_CAP_EXCEEDED") {
    return [issue({ code: f.code, source: "engine",
      employeeId: s.employeeId, subjectId: s.id, title: "Payroll check",
      raisedAs: f.message, en: `${possessive(nameOf(c, s.employeeId))} ` +
        "payslip needs a look before approval." })];
  }
  const day = f.detail["date"]!;
  const mins = Number(f.detail["minutes"]);
  const max = Number(f.detail["maxMinutes"]);
  return [issue({ code: f.code, source: "engine", employeeId: s.employeeId,
    subjectId: s.id, title: "Overtime above the daily limit",
    raisedAs: f.message, date: dateOf(day),
    en: `${nameOf(c, s.employeeId)} worked ${duration(mins)} of ` +
      `overtime on ${dateOf(day).display}, above the ` +
      `${max % 60 === 0 ? `${max / 60}-hour` : `${max}-minute`} daily ` +
      "limit. Every minute is still paid." })];
}

function engineFlags(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) =>
    s.payslip.flags.flatMap((f) => flagIssue(c, s, f)));
}

function deferred(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) => s.payslip.deferred.map((d) =>
    issue({ code: "DEDUCTION_DEFERRED", source: "engine",
      employeeId: s.employeeId, subjectId: d.ref,
      title: "Loan deduction capped",
      raisedAs: `${d.reason}: deferred ${d.deferred}`,
      en: `${possessive(nameOf(c, s.employeeId))} loan instalment is ` +
        `${formatAed(d.requested)}, but only ${formatAed(d.taken)} can ` +
        `be deducted this month. The remaining ${formatAed(d.deferred)} ` +
        "moves to next month." })));
}

/** Sick days the engine left unpaid because of probation. */
function probationSick(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) => {
    const line = s.trace.find((l) => l.id === "leave.sick");
    const n = Number(line?.inputs["probation"] ?? "0");
    if (line === undefined || n === 0) return [];
    const days = s.input.absences.filter((a) => a.kind === "sick");
    const when = days.length === 1 ? `on ${dateOf(days[0]!.date).display}`
      : `for ${plural(n, "day", "days")}`;
    return [issue({ code: "SICK_UNPAID_PROBATION", severity: "info",
      source: "engine", employeeId: s.employeeId, subjectId: s.id,
      title: "Sick day in probation is unpaid",
      date: days.length === 1 ? dateOf(days[0]!.date) : null,
      raisedAs: `${line.label}: ${n} unpaid in probation`,
      en: `${nameOf(c, s.employeeId)} was off sick ${when} while on ` +
        `probation, so ${n === 1 ? "that day is" : "those days are"} ` +
        "unpaid." })];
  });
}

/** Lines as in the file: EDR per employee, EVP after it, SCR last. */
export function sifPlace(c: DemoCompany, f: Finding): SifPlace {
  const lines = c.sif.text.split(/\r?\n/);
  const type = (lines[f.line - 1] ?? "").split(",")[0] as SifPlace["record"];
  const edrNumber = type === "EDR" ? lines.slice(0, f.line)
    .filter((l) => l.startsWith("EDR")).length : null;
  return { fileLine: f.line, record: type, edrNumber };
}

function sifFindings(c: DemoCompany): DemoIssue[] {
  const byAccount = new Map(c.employees.flatMap((e) => e.iban === null
    ? [] : [[e.iban.value, e.id] as const]));
  return c.sif.findings.map((f) => {
    const employeeId = byAccount.get(f.value) ?? null;
    const at = { source: "sif-validator" as const, employeeId,
      subjectId: `${c.sif.fileName}:${f.line}`, raisedAs: f.message,
      sif: sifPlace(c, f), severity: f.severity };
    if (f.code === "ROUTING_UNKNOWN") {
      return issue({ ...at, code: f.code, kind: "note",
        severity: "info", title: "Demo bank code",
        en: "This demo uses an invented bank, so its routing code is " +
          "not in the bank code list. A real bank's code is checked " +
          "here." });
    }
    if (f.code === "IBAN_CHECKSUM" && employeeId !== null) {
      return issue({ ...at, code: f.code,
        title: "Bank account number has a typo",
        en: `${possessive(nameOf(c, employeeId))} IBAN does not add up: ` +
          "one digit is probably mistyped, so the bank would reject " +
          "this payment." });
    }
    return issue({ ...at, code: f.code, title: "Salary file check",
      en: `The salary file check found a problem: ${f.message}.` });
  });
}

function held(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) => s.sif.included ? []
    : [issue({ code: "SIF_HELD_NO_IBAN", severity: "error",
      source: "sif-batch", employeeId: s.employeeId, subjectId: s.id,
      title: "Bank details missing",
      en: `${nameOf(c, s.employeeId)} has no bank account number on ` +
        `file, so the October pay of ${formatAed(s.payslip.net)} is ` +
        "held out of the salary file." })]);
}

/** [title form, in-sentence form] of each document kind. */
const DOC: Record<string, [string, string]> = {
  "residence-visa": ["Residence visa", "residence visa"],
  "emirates-id": ["Emirates ID", "Emirates ID"],
  passport: ["Passport", "passport"] };

function documents(c: DemoCompany): DemoIssue[] {
  return c.documents.filter((d) => d.daysLeft <= 30).map((d) => {
    const [title, noun] = DOC[d.kind] ?? ["Document", "document"];
    return issue({ code: "DOCUMENT_EXPIRING", source: "documents",
      employeeId: d.employeeId, subjectId: d.id, date: dateOf(d.expiresOn),
      title: d.daysLeft < 0 ? `${title} has expired`
        : `${title} expires soon`,
      en: `${possessive(nameOf(c, d.employeeId))} ${noun} ` +
        `${d.daysLeft < 0 ? "expired on" : "expires on"} ` +
        `${whenText(d.expiresOn, d.daysLeft)}.` });
  });
}

function settlements(c: DemoCompany): DemoIssue[] {
  return c.payRun.settlements.map((s) => issue({
    code: "SETTLEMENT_PARTIAL", source: "engine", employeeId: s.employeeId,
    subjectId: null, title: "Final settlement needs notice pay",
    raisedAs: s.result.notComputed.join(", "),
    en: `${possessive(nameOf(c, s.employeeId))} gratuity and unused ` +
      "leave pay are worked out. Notice pay and any deductions still " +
      "need to be added by hand." }));
}

function pension(c: DemoCompany): DemoIssue[] {
  const n = c.payRun.payslips.filter((s) => s.pension !== null).length;
  return [issue({ code: "PENSION_NOT_COMPUTED", kind: "needs-confirmation",
    severity: "info", source: "demo-scope", employeeId: null,
    subjectId: c.payRun.id, count: n, title: "Pension: confirm the fund",
    en: `Pension for the ${plural(n, "UAE national", "UAE nationals")} ` +
      "is set up once the fund is confirmed. Nationals working in Abu " +
      "Dhabi may belong to the Abu Dhabi pension fund rather than the " +
      "federal fund, so their pay here does not include pension yet." })];
}

/** Every item: issues (most serious first), then confirmations, notes. */
export function issuesOf(c: DemoCompany): DemoIssue[] {
  const kind = { issue: 0, "needs-confirmation": 1, note: 2 } as const;
  const sev = { error: 0, warning: 1, info: 2 } as const;
  return [...held(c), ...sifFindings(c), ...engineFlags(c),
    ...deferred(c), ...probationSick(c), ...documents(c),
    ...settlements(c), ...pension(c)]
    .map((x, i) => ({ x, i }))
    .sort((a, b) => kind[a.x.kind] - kind[b.x.kind] ||
      sev[a.x.severity] - sev[b.x.severity] || a.i - b.i)
    .map(({ x }) => x);
}

/** The counted issues: no notes, no needs-confirmation items. */
export const openIssues = (c: DemoCompany): DemoIssue[] =>
  issuesOf(c).filter((i) => i.kind === "issue");
