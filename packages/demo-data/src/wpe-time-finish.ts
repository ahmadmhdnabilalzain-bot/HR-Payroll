import { addDays, daysBetween } from "@payroll/engine";
import { AS_OF, isWorkingDay } from "./calendar";
import { plural, type DisplayDate } from "./display";
import type { DemoCompany, DemoEmployee } from "./types";
import { HQ, KHALIDIYA, AL_AIN } from "./roster-data";
import { jobTitleText, placeText, shortDateOf, shortDateText } from "./wp3";
import { holidays } from "./wpd-templates";
import {
  SEVERITY_WORD,
  incidentsByMonth,
  type IncidentMonth,
  type IncidentView,
  type Severity,
} from "./wpe-safety";

/**
 * WPE time finish: comp-off days earned by working a public holiday
 * (T07) and one-off leave grants the General manager signs off (T07).
 * FICTIONAL sample data. Nobody is typed by name: people are picked by
 * job from the staff list, holidays come from the sample holiday list,
 * and nothing here changes a leave balance, a payslip or the run.
 */

/** The sample company rule: one day off for one holiday day worked. */
export const COMP_OFF_VALID_DAYS = 90;
/** An earned day is "expiring" when this few days are left. */
export const COMP_OFF_SOON_DAYS = 30;

export const COMP_OFF_NOTE = "Sample company rule: working a public " +
  `holiday earns one day off, to be taken within ${COMP_OFF_VALID_DAYS} ` +
  "days. As we read the rules, work on an official holiday earns a rest " +
  "day or pay, so this is a rest day. The holiday dates are samples. " +
  "Comp-off is kept apart from the annual leave balance.";

export const GRANT_NOTE = "A grant is a one-off extra leave day or two, " +
  "given by the General manager. It is recorded here and kept apart from " +
  "the annual leave balance, which it does not change.";

export const GRANT_MAX_DAYS = 5;

/** Jobs that are on call or at the payments cut-off on a holiday. */
const ON_DUTY_JOBS = ["operations-officer", "systems-engineer",
  "payments-officer", "customer-service-officer"];

const byId = (c: DemoCompany, id: string): DemoEmployee =>
  c.employees.find((e) => e.id === id)!;
const gmOf = (c: DemoCompany): DemoEmployee =>
  c.employees.find((e) => e.jobKey === "general-manager")!;
const hrOf = (c: DemoCompany): DemoEmployee => byId(c,
  c.approvals.find((a) => a.kind === "pay-run")!.makerEmployeeId);

const onStaff = (e: DemoEmployee, iso: string): boolean =>
  e.joiningDate <= iso && (e.leavingDate === null || e.leavingDate > iso);

/* ---------------------------------------------------------------- *
 * Comp-off earned
 * ---------------------------------------------------------------- */

export type CompOffStatus = "available" | "expiring" | "expired";

export interface CompOffRow {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  holidayId: string;
  holidayName: string;
  workedOn: DisplayDate;
  days: number;
  expiresOn: DisplayDate;
  daysLeft: number;
  status: CompOffStatus;
  display: { earned: string; left: string };
}

/** The first working day of a holiday, or null if it falls on a rest day. */
function firstWorkingDay(from: string, to: string): string | null {
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isWorkingDay(d)) return d;
  }
  return null;
}

/**
 * One day earned for each person on duty on a past holiday. Who is on
 * duty follows the holiday's place in the list, so it never changes.
 */
export function compOffRows(c: DemoCompany): CompOffRow[] {
  const out: CompOffRow[] = [];
  const past = holidays(c).filter((h) => h.state === "past");
  past.forEach((h, i) => {
    const day = firstWorkingDay(h.from, h.to);
    if (day === null) return;
    const pool = c.employees.filter((e) => ON_DUTY_JOBS.includes(e.jobKey) &&
      onStaff(e, day));
    if (pool.length === 0) return;
    const picks = [...new Set([pool[i % pool.length]!,
      pool[(i + 2) % pool.length]!])];
    for (const e of picks) {
      const expires = addDays(day, COMP_OFF_VALID_DAYS);
      const left = daysBetween(AS_OF, expires);
      const status: CompOffStatus = left < 0 ? "expired"
        : left <= COMP_OFF_SOON_DAYS ? "expiring" : "available";
      out.push({ id: `co-${h.id}-${e.id}`, employeeId: e.id,
        name: e.fullName, title: jobTitleText(e.jobKey), holidayId: h.id,
        holidayName: h.name, workedOn: shortDateOf(day), days: 1,
        expiresOn: shortDateOf(expires), daysLeft: left, status,
        display: { earned: `1 day for working ${h.name}`,
          left: left < 0 ? "Expired"
            : `Take by ${shortDateOf(expires).display}` } });
    }
  });
  return out.sort((a, b) => b.workedOn.iso.localeCompare(a.workedOn.iso) ||
    a.name.localeCompare(b.name));
}

export interface CompOffBalance {
  employeeId: string;
  name: string;
  title: string;
  earned: number;
  expired: number;
  available: number;
  nextExpiry: DisplayDate | null;
  display: { available: string; next: string };
}

/** One balance a person: days earned, days that ran out, days to take. */
export function compOffBalances(c: DemoCompany): CompOffBalance[] {
  const rows = compOffRows(c);
  const ids = [...new Set(rows.map((r) => r.employeeId))];
  return ids.map((id) => {
    const mine = rows.filter((r) => r.employeeId === id);
    const live = mine.filter((r) => r.status !== "expired");
    const soon = live.map((r) => r.expiresOn)
      .sort((a, b) => a.iso.localeCompare(b.iso))[0] ?? null;
    const n = live.reduce((s, r) => s + r.days, 0);
    return { employeeId: id, name: mine[0]!.name, title: mine[0]!.title,
      earned: mine.reduce((s, r) => s + r.days, 0),
      expired: mine.filter((r) => r.status === "expired")
        .reduce((s, r) => s + r.days, 0),
      available: n, nextExpiry: soon,
      display: { available: plural(n, "day", "days") + " to take",
        next: soon === null ? "Nothing to take"
          : `Earliest expiry ${soon.display}` } };
  }).sort((a, b) => b.available - a.available ||
    a.name.localeCompare(b.name));
}

/* ---------------------------------------------------------------- *
 * Leave grants
 * ---------------------------------------------------------------- */

export interface GrantRow {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  days: number;
  reason: string;
  requestedById: string;
  requestedByName: string;
  signedOffById: string;
  signedOffByName: string;
  grantedOn: DisplayDate;
  display: { days: string; by: string };
}

const SEEDS: readonly [string, number, string, string][] = [
  ["operations-manager", 2, "Covered the Eid week on call", "2026-09-14"],
  ["relationship-manager", 1, "Closed the half-year client review " +
    "after hours", "2026-10-06"],
];

/** Grants already signed off by the General manager before the demo. */
export function grantRows(c: DemoCompany): GrantRow[] {
  const gm = gmOf(c);
  const hr = hrOf(c);
  return SEEDS.map(([job, days, reason, on], i) => {
    const e = c.employees.find((x) => x.jobKey === job &&
      x.leavingDate === null)!;
    return { id: `grant-${i + 1}`, employeeId: e.id, name: e.fullName,
      title: jobTitleText(e.jobKey), days, reason, requestedById: hr.id,
      requestedByName: hr.fullName, signedOffById: gm.id,
      signedOffByName: gm.fullName, grantedOn: shortDateOf(on),
      display: { days: plural(days, "day", "days"),
        by: `Signed off by ${gm.fullName}, General manager, ` +
          shortDateOf(on).display } };
  }).sort((a, b) => b.grantedOn.iso.localeCompare(a.grantedOn.iso));
}

export interface GrantInput { employeeId: string; days: number;
  reason: string }

/** The plain reason a grant cannot be sent, or null. */
export function checkGrant(c: DemoCompany, i: GrantInput): string | null {
  const e = c.employees.find((x) => x.id === i.employeeId);
  if (e === undefined || e.leavingDate !== null) {
    return "Choose someone who works here.";
  }
  if (!Number.isInteger(i.days) || i.days < 1 || i.days > GRANT_MAX_DAYS) {
    return `Give a whole number of days, from 1 to ${GRANT_MAX_DAYS}.`;
  }
  if (i.reason.trim().length < 5) {
    return "Say why, in a few words, so the General manager can see it.";
  }
  return null;
}

/** People a grant can go to, for the form. */
export function grantPeople(c: DemoCompany): { id: string; name: string;
  title: string }[] {
  return c.employees.filter((e) => e.leavingDate === null)
    .map((e) => ({ id: e.id, name: e.fullName,
      title: jobTitleText(e.jobKey) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------------------------------------------------------------- *
 * E14 Report a safety incident (the employee's side)
 * ---------------------------------------------------------------- */

/** The three fields an employee fills in. */
export interface IncidentReportInput {
  what: string;
  /** A location id from `incidentPlaces`. */
  place: string;
  severity: Severity;
}

export const INCIDENT_SEVERITY: readonly { value: Severity; label: string;
  help: string }[] = [
  { value: "low", label: "Low", help: "Nobody hurt; something to fix." },
  { value: "medium", label: "Medium", help: "A small injury or a close " +
    "call." },
  { value: "high", label: "High", help: "Someone needs a doctor, or " +
    "there is danger now." },
];

export const INCIDENT_REPORT_NOTE = "HR reads every report and records " +
  "what was done. Nothing is sent to any authority from this page. " +
  "If someone is in danger, call for help first.";

export function incidentPlaces(): { id: string; label: string }[] {
  return [HQ, KHALIDIYA, AL_AIN].map((id) => ({ id,
    label: placeText(id) }));
}

/** The plain reason a report cannot be sent, or null. */
export function checkIncidentReport(i: IncidentReportInput): string | null {
  if (i.what.trim().length < 10) {
    return "Say what happened in a sentence, at least a few words.";
  }
  if (!incidentPlaces().some((p) => p.id === i.place)) {
    return "Choose where it happened.";
  }
  if (!INCIDENT_SEVERITY.some((s) => s.value === i.severity)) {
    return "Choose how serious it was.";
  }
  return null;
}

/** A short title: the first sentence, cut at a word. */
export function incidentTitle(what: string): string {
  const first = (what.trim().split(/[.!?\n]/)[0] ?? "").trim();
  if (first.length <= 56) return first;
  return `${first.slice(0, 56).replace(/\s+\S*$/, "")}...`;
}

/**
 * A report as the HR log shows it: open, no action yet, the reporter
 * named as both the one involved and the one who reported (HR can
 * correct who was involved when they record action).
 */
export function incidentFromReport(c: DemoCompany, id: string,
  reporterId: string, on: string, i: IncidentReportInput): IncidentView {
  const who = byId(c, reporterId).fullName;
  const place = placeText(i.place);
  return { id, title: incidentTitle(i.what), what: i.what.trim(),
    severity: i.severity, severityWord: SEVERITY_WORD[i.severity],
    status: "open", happenedOn: shortDateOf(on), placeText: place,
    involvedId: reporterId, involvedName: who, reportedById: reporterId,
    reportedByName: who, actions: [],
    display: { when: `${shortDateText(on)}, ${place}`, who,
      actions: "No action yet" } };
}

/** The monthly report with reports made in this visit counted in. */
export function incidentsByMonthWith(c: DemoCompany,
  closed: readonly string[], extra: readonly IncidentView[]): IncidentMonth[] {
  return incidentsByMonth(c, closed).map((m) => {
    const mine = extra.filter((x) => x.happenedOn.iso.startsWith(m.monthIso));
    const n = (s: Severity) => mine.filter((x) => x.severity === s).length;
    return { ...m, low: m.low + n("low"), medium: m.medium + n("medium"),
      high: m.high + n("high"), total: m.total + mine.length,
      open: m.open + mine.filter((x) => x.status !== "closed" &&
        !closed.includes(x.id)).length };
  });
}
