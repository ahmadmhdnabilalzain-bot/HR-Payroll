import { addDays, daysBetween, fils, formatAed } from "@payroll/engine";
import { AS_OF, isWorkingDay, weekday, workingDaysBetween } from
  "./calendar";
import { plural } from "./display";
import { letters, type LetterKind } from "./papers";
import { AL_AIN, HQ, KHALIDIYA } from "./roster-data";
import { punches, unmatchedPunches } from "./time";
import type { DemoCompany, DemoEmployee } from "./types";
import {
  appraisalCycleViews,
  goalViews,
  type GoalKind,
} from "./wp2";
import {
  joinerChecklistViews,
  jobTitleText,
  leaverChecklistView,
  placeText,
  shortDateText,
  type MoveChecklistItem,
} from "./wp3";

/**
 * WPD templates: letter and checklist templates, the KPI library,
 * attendance devices and the holiday list. FICTIONAL. Templates are
 * read from the letters and checklists the demo already holds, so a
 * template cannot disagree with a letter or a task made from it.
 * Unlocks map rows S03, S04, S06, S18 and T07.
 */

/* ---------------------------------------------------------------- *
 * S03 Letter templates
 * ---------------------------------------------------------------- */

export interface LetterTemplate {
  id: string;
  kind: LetterKind;
  name: string;
  body: string;
  fields: string[];
  signedBy: string;
  issued: number;
  waiting: number;
  display: { usage: string };
}

const BODIES: Record<LetterKind, string> = {
  "salary-certificate": "To {addressee}. This letter confirms that " +
    "{name} ({number}) works at Zarqan Demo Bank as {job}, " +
    "joined {joined}. Monthly salary: {salary}. Issued at the " +
    "employee's request for {purpose}.",
  noc: "To {addressee}. Zarqan Demo Bank has no objection " +
    "to {name}, {job}, applying for {purpose}. This letter does not " +
    "commit the bank to anything else.",
  experience: "To {addressee}. {name} ({number}) worked at Zarqan Demo " +
    "Bank as {job}, joined {joined}. Issued for {purpose}.",
};

const FIELD_RE = /\{([a-z]+)\}/g;

/** One template per letter kind; names are the ones the letters show. */
export function letterTemplates(c: DemoCompany): LetterTemplate[] {
  const hr = c.employees.find((e) => e.jobKey === "hr-manager")!;
  const all = letters(c);
  return (Object.keys(BODIES) as LetterKind[]).map((kind) => {
    const mine = all.filter((l) => l.kind === kind);
    const issued = mine.filter((l) => l.status === "issued").length;
    const waiting = mine.filter((l) => l.status !== "issued").length;
    return { id: `lttpl-${kind}`, kind, name: mine[0]!.display.kind,
      body: BODIES[kind],
      fields: [...new Set([...BODIES[kind].matchAll(FIELD_RE)]
        .map((m) => m[1]!))],
      signedBy: `${hr.fullName}, ${jobTitleText(hr.jobKey)}`, issued,
      waiting, display: { usage: `${issued} issued, ${waiting} waiting` } };
  });
}

const contractSalary = (e: DemoEmployee): bigint => e.basicMonthly +
  e.allowances.reduce((n, a) => n + a.monthly, 0n);

/** A letter filled in from a template for one person (a preview). */
export function renderLetterTemplate(c: DemoCompany, templateId: string,
  employeeId: string, purpose: string, addressee: string): string {
  const t = letterTemplates(c).find((x) => x.id === templateId)!;
  const e = c.employees.find((x) => x.id === employeeId)!;
  const v: Record<string, string> = { name: e.fullName,
    number: e.number, job: jobTitleText(e.jobKey),
    joined: shortDateText(e.joiningDate), purpose, addressee,
    salary: `${formatAed(fils(contractSalary(e)))} a month, as per ` +
      "contract" };
  return t.body.replace(FIELD_RE, (_m, k: string) => v[k]!);
}

/* ---------------------------------------------------------------- *
 * S04 Checklist templates
 * ---------------------------------------------------------------- */

export interface ChecklistTemplateStep {
  key: string;
  label: string;
  ownerRole: MoveChecklistItem["ownerRole"];
  ownerText: string;
  dueOffsetDays: number;
  display: { due: string };
}

export interface ChecklistTemplate {
  id: "pre-joiner" | "joiner" | "leaver";
  name: string;
  anchor: string;
  steps: ChecklistTemplateStep[];
  usedBy: number;
}

function dueText(n: number, anchor: string): string {
  if (n === 0) return `On ${anchor}`;
  return `${plural(Math.abs(n), "day", "days")} ${n < 0 ? "before"
    : "after"} ${anchor}`;
}

function stepsOf(lists: { anchor: string; items: MoveChecklistItem[] }[],
  anchorText: string): ChecklistTemplateStep[] {
  const out = new Map<string, ChecklistTemplateStep>();
  for (const l of lists) {
    for (const i of l.items) {
      if (out.has(i.key)) continue;
      const n = daysBetween(l.anchor, i.dueOn.iso);
      out.set(i.key, { key: i.key, label: i.label, ownerRole: i.ownerRole,
        ownerText: i.ownerText, dueOffsetDays: n,
        display: { due: dueText(n, anchorText) } });
    }
  }
  return [...out.values()];
}

/**
 * Pre-joiner (candidates before the offer is countersigned), joiner and
 * leaver templates: every step any live checklist of that kind uses.
 */
export function checklistTemplates(c: DemoCompany): ChecklistTemplate[] {
  const all = joinerChecklistViews(c);
  const pre = all.filter((j) => j.employeeId === null);
  const joiners = all.filter((j) => j.employeeId !== null);
  const leavers = c.employees.filter((e) => e.cases.includes("leaver"))
    .flatMap((e) => leaverChecklistView(c, e.id) ?? []);
  const join = (l: typeof all) => l.map((j) => ({
    anchor: j.joiningDate.iso, items: j.items }));
  return [{ id: "pre-joiner", name: "Before the first day checklist",
    anchor: "first day", usedBy: pre.length,
    steps: stepsOf(join(pre), "the first day") },
  { id: "joiner", name: "New joiner checklist",
    anchor: "first day", usedBy: joiners.length,
    steps: stepsOf(join(joiners), "the first day") },
  { id: "leaver", name: "Leaver checklist", anchor: "last working day",
    usedBy: leavers.length,
    steps: stepsOf(leavers.map((l) => ({ anchor: l.lastWorkingDay.iso,
      items: l.items })), "the last working day") }];
}

/* ---------------------------------------------------------------- *
 * S06 KPI library and periods
 * ---------------------------------------------------------------- */

export interface KpiLibraryItem {
  id: string;
  title: string;
  unit: string;
  target: number;
  departmentId: string;
  departmentText: string;
  assignedPeople: number;
  display: { target: string; assigned: string };
}

/** Wording kept to the demo's rule: signed off, never approved. */
const plainTitle = (t: string): string =>
  t.replace(/\bapproved\b/g, "signed off");

const slug = (t: string): string => t.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The goals every department sets, as a library to pick from. */
export function kpiLibrary(c: DemoCompany): KpiLibraryItem[] {
  const dept = goalViews(c, { kind: "department" as GoalKind });
  const mine = goalViews(c).filter((g) => g.kind !== "department");
  return dept.map((g) => {
    const n = mine.filter((m) => m.title === g.title).length;
    return { id: `kpi-${slug(plainTitle(g.title))}`,
      title: plainTitle(g.title), unit: g.unit, target: g.target,
      departmentId: g.departmentId, departmentText: g.departmentText,
      assignedPeople: n, display: { target: `${g.target} ${g.unit}`,
        assigned: plural(n, "person", "people") } };
  });
}

export interface KpiPeriod { id: string; name: string; status: string;
  display: { period: string; closes: string } }

/** The review periods the KPIs are scored in (appraisal cycles). */
export function kpiPeriods(c: DemoCompany): KpiPeriod[] {
  return appraisalCycleViews(c).map((p) => ({ id: p.id, name: p.name,
    status: p.status === "open" ? "Open" : "Closed",
    display: { period: `${p.periodStart.display} to ${p.periodEnd.display}`,
      closes: p.closesOn.display } }));
}

/* ---------------------------------------------------------------- *
 * S18 Attendance devices and feeds
 * ---------------------------------------------------------------- */

export interface AttendanceDevice {
  id: string;
  label: string;
  kind: "reader" | "phone";
  locations: string[];
  /** The source names punches and unmatched punches carry. */
  feedNames: string[];
  punchesToday: number;
  unmatched: number;
  display: { where: string; lastPunch: string; today: string };
}

const DEVICE_DEFS: readonly { id: string; label: string;
  kind: "reader" | "phone"; locations: string[]; feeds: string[] }[] = [
  { id: "dev-hq", label: "Head office reader", kind: "reader",
    locations: [HQ], feeds: ["Head office reader"] },
  { id: "dev-branch", label: "Branch reader", kind: "reader",
    locations: [KHALIDIYA, AL_AIN],
    feeds: ["Branch reader", "Al Ain branch reader"] },
  { id: "dev-phone", label: "Phone, inside the office area",
    kind: "phone", locations: [HQ, KHALIDIYA, AL_AIN],
    feeds: ["Phone, inside the office area"] },
];

/** Devices, with today's punches and unmatched punches per device. */
export function attendanceDevices(c: DemoCompany): AttendanceDevice[] {
  const today = punches(c);
  const odd = unmatchedPunches(c);
  return DEVICE_DEFS.map((d) => {
    const mine = today.filter((p) => d.feeds.includes(p.source));
    const times = mine.flatMap((p) => [p.in, p.out])
      .filter((t): t is string => t !== null).sort();
    const un = odd.filter((u) => d.feeds.includes(u.reader)).length;
    return { id: d.id, label: d.label, kind: d.kind,
      locations: d.locations, feedNames: d.feeds,
      punchesToday: mine.length, unmatched: un,
      display: { where: d.locations.map(placeText).join(", "),
        lastPunch: times.length === 0 ? "No punches today"
          : `Last punch today at ${times.at(-1)!}`,
        today: `${plural(mine.length, "person", "people")} today, ` +
          `${un} to match` } };
  });
}

/* ---------------------------------------------------------------- *
 * T07 Holidays (SAMPLE dates)
 * ---------------------------------------------------------------- */

export const HOLIDAY_NOTE = "Sample dates. The real dates follow the " +
  "official announcement.";

export interface HolidayView {
  id: string;
  name: string;
  from: string;
  to: string;
  workingDaysOff: number;
  state: "past" | "upcoming";
  display: { dates: string; weekdays: string; workingDays: string;
    when: string; note: string };
}

const HOLIDAYS: readonly [string, string, string, string][] = [
  ["hol-new-year-2026", "New Year", "2026-01-01", "2026-01-01"],
  ["hol-eid-fitr", "Eid al-Fitr", "2026-03-20", "2026-03-22"],
  ["hol-arafat", "Arafat Day", "2026-05-26", "2026-05-26"],
  ["hol-eid-adha", "Eid al-Adha", "2026-05-27", "2026-05-29"],
  ["hol-islamic-new-year", "Islamic New Year", "2026-06-17",
    "2026-06-17"],
  ["hol-prophet", "Prophet's Birthday", "2026-08-25", "2026-08-25"],
  ["hol-national-day", "UAE National Day", "2026-12-02", "2026-12-03"],
  ["hol-new-year-2027", "New Year", "2027-01-01", "2027-01-01"],
];

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday"];

/** Every date in a holiday, from first to last day. */
export const holidayDates = (h: { from: string; to: string }): string[] =>
  Array.from({ length: daysBetween(h.from, h.to) + 1 }, (_, i) =>
    addDays(h.from, i));

const rangeText = (from: string, to: string): string =>
  from === to ? shortDateText(from) : `${shortDateText(from)} to ` +
    shortDateText(to);

/** The holiday list: sample dates, labelled as such on every row. */
export function holidays(_c?: DemoCompany): HolidayView[] {
  return HOLIDAYS.map(([id, name, from, to]) => {
    const days = holidayDates({ from, to });
    const off = workingDaysBetween(from, to).length;
    const left = daysBetween(AS_OF, from);
    return { id, name, from, to, workingDaysOff: off,
      state: to < AS_OF ? "past" : "upcoming",
      display: { dates: rangeText(from, to),
        weekdays: days.map((d) => WEEKDAY[weekday(d)]!).join(", "),
        workingDays: off === 0 ? "Falls on a weekend"
          : `${plural(off, "working day", "working days")} off`,
        when: to < AS_OF ? "Passed" : left === 0 ? "Today"
          : `In ${plural(left, "day", "days")}`,
        note: HOLIDAY_NOTE } };
  });
}

export const nextHoliday = (c: DemoCompany): HolidayView | null =>
  holidays(c).find((h) => h.state === "upcoming") ?? null;

/** True when a date is inside a listed holiday (sample dates). */
export const isHoliday = (iso: string): boolean => holidays().some((h) =>
  iso >= h.from && iso <= h.to);

/** A working day that is not a holiday: what payroll treats as work. */
export const isPaidWorkDay = (iso: string): boolean =>
  isWorkingDay(iso) && !isHoliday(iso);
