import { addDays, type Fils } from "@payroll/engine";
import {
  LEGAL_DUE_NOTE,
  PAY_CALENDAR,
  SETTLEMENT_DUE_BASIS,
  SETTLEMENT_DUE_DAYS,
} from "./calendar";
import { dateOf, plural, type DisplayDate } from "./display";
import { issuesOf } from "./issues";
import type { DemoCompany } from "./types";

export interface CalendarItem { key: string; label: string;
  date: DisplayDate; basis: "sample date" | "our reading" }

export interface PayCalendar {
  asOf: string; cutOff: string; approveBy: string;
  salaryFileSent: string; payday: string;
  /** 14 days after the leaver's last working day (our reading). */
  settlementDue: DisplayDate & { basis: string } | null;
  legalDueNote: string;
  /** The timeline in order, each with its display date. */
  items: CalendarItem[];
  label: "sample dates";
}

function settlementDueOf(c: DemoCompany): PayCalendar["settlementDue"] {
  const s = c.payRun.settlements[0];
  const e = c.employees.find((x) => x.id === s?.employeeId);
  if (e?.leavingDate == null) return null;
  return { ...dateOf(addDays(e.leavingDate, SETTLEMENT_DUE_DAYS)),
    basis: SETTLEMENT_DUE_BASIS };
}

/** The pay-month timeline: SAMPLE dates, labelled as such. */
export function payCalendar(c: DemoCompany): PayCalendar {
  const p = PAY_CALENDAR;
  const due = settlementDueOf(c);
  const sample = (key: string, label: string, iso: string)
    : CalendarItem => ({ key, label, date: dateOf(iso),
    basis: "sample date" });
  const items = [sample("cutOff", "Cut-off for changes", p.cutOff),
    sample("asOf", "Today", p.asOf),
    sample("approveBy", "Sign off by", p.approveBy),
    sample("salaryFileSent", "Salary file sent", p.salaryFileSent),
    sample("payday", "Payday", p.payday),
    ...(due === null ? [] : [{ key: "settlementDue",
      label: "Final settlement due", date: { iso: due.iso,
        display: due.display }, basis: "our reading" as const }])]
    .sort((a, b) => a.date.iso < b.date.iso ? -1 : 1);
  return { asOf: p.asOf, cutOff: p.cutOff, approveBy: p.approveBy,
    salaryFileSent: p.salaryFileSent, payday: p.payday,
    settlementDue: due, legalDueNote: LEGAL_DUE_NOTE, items,
    label: p.label };
}

export interface SifSummary {
  fileName: string;
  employees: number;
  heldOut: number;
  total: Fils;
  /** The demo's reading of the findings: checksum failures count. */
  problems: number;
  notes: number;
  /** "1 problem to fix, 1 note": what the summary opens with. */
  headlineText: string;
  lines: { total: number; edr: number; evp: number; scr: number };
  /** "30 people, 61 lines: ...". */
  linesNote: string;
  /** packages/wps's own report, unchanged, for the detail view. */
  validatorReport: string;
  rulesScope: string;
}

function linesOf(c: DemoCompany): SifSummary["lines"] {
  const rows = c.sif.text.split(/\r?\n/).filter((l) => l !== "");
  const n = (t: string) => rows.filter((l) => l.startsWith(t)).length;
  return { total: rows.length, edr: n("EDR"), evp: n("EVP"),
    scr: n("SCR") };
}

function linesNoteOf(l: SifSummary["lines"]): string {
  const allowance = l.evp === l.edr ? "an allowance line for each person"
    : `an allowance line for ${plural(l.evp, "person", "people")}`;
  return `${plural(l.edr, "person", "people")}, ${l.total} lines: a ` +
    `salary line ${l.evp === l.edr ? "and " : "for each person, "}` +
    `${allowance}, plus a control line`;
}

/**
 * The bank-file summary in the demo's own words: a failed IBAN check
 * is a problem to fix (the validator calls it a warning), the
 * invented bank code is a note. packages/wps is not changed.
 */
export function sifSummary(c: DemoCompany): SifSummary {
  const sif = issuesOf(c).filter((i) => i.source === "sif-validator");
  const problems = sif.filter((i) => i.kind === "issue").length;
  const notes = sif.filter((i) => i.kind === "note").length;
  const lines = linesOf(c);
  const head = problems === 0 ? "No problems to fix"
    : plural(problems, "problem to fix", "problems to fix");
  return { fileName: c.sif.fileName, employees: c.sif.employees,
    heldOut: c.payRun.payslips.filter((s) => !s.sif.included).length,
    total: c.sif.total, problems, notes,
    headlineText: notes === 0 ? head : `${head}, ${plural(notes, "note",
      "notes")}`, lines, linesNote: linesNoteOf(lines),
    validatorReport: c.sif.report, rulesScope: c.rulesScope };
}
