import {
  daysBetween,
  daysInMonth,
  formatIsoDate,
  addDays,
  parseIsoDate,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { dateOf, displayDate, plural, type DisplayDate } from "./display";
import type { DemoCompany, DemoEmployee } from "./types";

/**
 * WPE privacy and retention (S26). FICTIONAL sample data. This is a
 * record of what is tracked, not a statement that anything meets the
 * UAE personal data law (Federal Decree-Law 45 of 2021). Retention
 * periods and the days allowed to answer a request are company
 * choices: the law text read for this demo sets neither (see
 * docs/research/2026-11-26-pdpl-primary.md), so every value here is a
 * sample marked "to confirm with counsel". Nothing is deleted.
 */

export const TO_CONFIRM = "Sample, to confirm with counsel";

export const PRIVACY_NOTICE = "This page lists what the company keeps " +
  "and the requests it has logged. It does not say the company meets " +
  "any law. The retention periods and the days to answer a request " +
  "are the company's own choices, shown as samples to confirm with " +
  "counsel. Nothing is deleted.";

/** Days allowed to answer a request: a company choice, not a rule. */
export const RESPONSE_DAYS_DEFAULT = 30;

export interface PrivacyCategory {
  id: string;
  name: string;
  /** What is kept, in plain words. */
  holds: string;
  why: string;
  /** The Article 4 ground, as we read it; to confirm with counsel. */
  basis: string;
  /** Marked sensitive in Article 1 (health). */
  sensitive: boolean;
  /** Roles that can see it. */
  seenBy: string[];
  /** People with records in this category. */
  people: number;
  /** Sample period in months after leaving. */
  sampleMonths: number;
  sampleNote: string;
}

const active = (c: DemoCompany): DemoEmployee[] => c.employees;

const OTHER_LAWS = "Article 4(10), duties in other laws, as we read it";

export function privacyCategories(c: DemoCompany): PrivacyCategory[] {
  const n = active(c).length;
  const cat = (p: Omit<PrivacyCategory, "people" | "sampleNote">):
    PrivacyCategory => ({ ...p, people: n, sampleNote: TO_CONFIRM });
  return [
    cat({ id: "identity", name: "Identity",
      holds: "Name, Emirates ID, nationality, contact details.",
      why: "To employ a person and to file their records.",
      basis: `Article 4(9), the employment contract, as we read it`,
      sensitive: false, seenBy: ["HR manager", "General manager"],
      sampleMonths: 60 }),
    cat({ id: "pay", name: "Pay and bank",
      holds: "Salary, payslips, bank account for the salary file.",
      why: "To pay salary and show what was paid.",
      basis: OTHER_LAWS, sensitive: false,
      seenBy: ["HR manager", "General manager"], sampleMonths: 60 }),
    cat({ id: "health", name: "Health",
      holds: "Sick-leave certificates and fitness-for-work notes.",
      why: "To decide sick leave and fitness to work.",
      basis: "Article 4(4), occupational medicine, as we read it",
      sensitive: true, seenBy: ["HR manager"], sampleMonths: 24 }),
    cat({ id: "documents", name: "Documents",
      holds: "Contracts, visa and permit papers, letters.",
      why: "To keep the papers the employment needs.",
      basis: OTHER_LAWS, sensitive: false,
      seenBy: ["HR manager", "General manager"], sampleMonths: 60 }),
    cat({ id: "time", name: "Time and attendance",
      holds: "Clock-in times, leave taken, overtime.",
      why: "To pay hours and leave correctly.",
      basis: "Article 4(8), employment obligations, as we read it",
      sensitive: false, seenBy: ["HR manager", "General manager",
        "Line manager"], sampleMonths: 36 }),
  ];
}

export type RequestKind = "access" | "correction" | "erasure";

export const REQUEST_KINDS: Record<RequestKind, { label: string;
  article: string; help: string }> = {
  access: { label: "Access", article: "Article 13",
    help: "The person asks for a copy of what is kept about them." },
  correction: { label: "Correction", article: "Article 15",
    help: "The person asks to fix a detail that is wrong." },
  erasure: { label: "Erasure", article: "Article 15",
    help: "The person asks for their data to be removed. Records the " +
      "company must keep for another law can stay." },
};

export interface SubjectRequest {
  id: string;
  kind: RequestKind;
  kindLabel: string;
  article: string;
  employeeId: string;
  name: string;
  receivedOn: DisplayDate;
  /** Received date plus the days the company chose to answer in. */
  dueOn: DisplayDate;
  summary: string;
  /** "Due in 9 days", "3 days overdue". */
  dueText: string;
  overdue: boolean;
}

const shown = (e: DemoEmployee): string => e.fullName;

/** A few sample requests, picked in a fixed way from the staff. */
export function subjectRequests(c: DemoCompany, days: number)
  : SubjectRequest[] {
  const staff = c.employees.filter((e) => e.leavingDate === null);
  const leaver = c.employees.find((e) => e.leavingDate !== null);
  const leftOn = leaver?.leavingDate == null ? "an earlier day"
    : displayDate(leaver.leavingDate);
  const pick = (i: number): DemoEmployee => staff[i % staff.length]!;
  const rows: { id: string; kind: RequestKind; who: DemoEmployee;
    ago: number; summary: string }[] = [
    { id: "dsr-001", kind: "access", who: pick(4), ago: 21,
      summary: "Asks for a copy of the personal data held about them." },
    { id: "dsr-002", kind: "correction", who: pick(9), ago: 6,
      summary: "Says the spelling of their name on the record is wrong." },
    { id: "dsr-003", kind: "erasure", who: leaver ?? pick(2), ago: 9,
      summary: `Left on ${leftOn} and asks for their data to be ` +
        "removed. Pay records may need to stay for another law." },
  ];
  return rows.map((r) => {
    const received = addDays(AS_OF, -r.ago);
    const due = addDays(received, days);
    const left = daysBetween(AS_OF, due);
    const k = REQUEST_KINDS[r.kind];
    return { id: r.id, kind: r.kind, kindLabel: k.label,
      article: k.article, employeeId: r.who.id, name: shown(r.who),
      receivedOn: dateOf(received), dueOn: dateOf(due),
      summary: r.summary, overdue: left < 0,
      dueText: left === 0 ? "Due today" : left > 0
        ? `Due in ${plural(left, "day", "days")}`
        : `${plural(-left, "day", "days")} overdue` };
  });
}

export interface RetentionRow {
  /** employee id + category id. */
  id: string;
  employeeId: string;
  name: string;
  categoryId: string;
  category: string;
  leftOn: DisplayDate;
  keepUntil: DisplayDate;
  /** keep: still inside the period; due: the period has passed. */
  state: "keep" | "due";
}

/** An ISO date plus whole months; the day is clamped to month end. */
export function addMonthsIso(iso: string, months: number): string {
  const d = parseIsoDate(iso);
  const total = d.y * 12 + (d.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return formatIsoDate({ y, m, d: Math.min(d.d, daysInMonth(y, m)) });
}

/**
 * What a retention run would remove today, for each leaver and each
 * category, from the periods in `months` (category id to months after
 * leaving; a missing category uses its sample). Only reads.
 */
export function retentionRun(c: DemoCompany,
  months: Readonly<Record<string, number>>): RetentionRow[] {
  const cats = privacyCategories(c);
  const out: RetentionRow[] = [];
  for (const e of c.employees.filter((x) => x.leavingDate !== null &&
    x.leavingDate <= AS_OF)) {
    for (const k of cats) {
      const until = addMonthsIso(e.leavingDate!,
        months[k.id] ?? k.sampleMonths);
      out.push({ id: `${e.id}:${k.id}`, employeeId: e.id,
        name: e.fullName, categoryId: k.id, category: k.name,
        leftOn: dateOf(e.leavingDate!), keepUntil: dateOf(until),
        state: until <= AS_OF ? "due" : "keep" });
    }
  }
  return out;
}
