import type { FeedScope } from "@payroll/contract";
import { addDays } from "@payroll/engine";
import { escapeIcsText, foldIcsLine } from "../export/ics";

export interface IcsEvent {
  uid: string;
  start: string;
  endInclusive: string;
  summary: string;
  description?: string;
}

/** Plan 11's deadline shape, as far as the feed needs it (local). */
export interface FeedDeadline {
  id: string;
  kind: "wps-salary" | "gpssa-contribution" | "emiratisation-checkpoint";
  dueDate: string;
  period: { year: number; month: number } | null;
  rule: { status: string };
}

export interface FeedInput {
  scope: FeedScope;
  viewerEmployeeId: string | null;
  leave: { id: string; employeeId: string; employeeName: string;
    typeName: string; start: string; end: string;
    status: "pending" | "approved" }[];
  holidays: { id: string; date: string; name: string;
    kind: "public" | "company" }[];
  deadlines: FeedDeadline[];
}

export const DEADLINE_LABELS: Record<FeedDeadline["kind"], string> = {
  "wps-salary": "WPS salary payment due",
  "gpssa-contribution": "GPSSA contribution due",
  "emiratisation-checkpoint": "Emiratisation checkpoint",
};

const ev = (uid: string, start: string, end: string, summary: string,
  description?: string): IcsEvent => ({ uid, start, endInclusive: end,
  summary, ...(description === undefined ? {} : { description }) });

function leaveEvents(i: FeedInput): IcsEvent[] {
  return i.leave.flatMap((l) => {
    const uid = `leave-${l.id}@payroll`;
    if (l.employeeId === i.viewerEmployeeId) {
      const what = l.status === "approved" ? "Leave" : "Leave (pending)";
      return [ev(uid, l.start, l.end, `${what}: ${l.typeName}`)];
    }
    // Others: approved only, and never the leave type (Ruling 21).
    if (i.scope !== "team" || l.status !== "approved") return [];
    return [ev(uid, l.start, l.end, `Away: ${l.employeeName}`)];
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Pure: the events a feed shows. */
export function feedEvents(i: FeedInput): IcsEvent[] {
  if (i.scope === "company-deadlines") {
    return i.deadlines.map((d) => ev(`deadline-${d.id}@payroll`, d.dueDate,
      d.dueDate, DEADLINE_LABELS[d.kind] + (d.period === null ? ""
        : ` (${d.period.year}-${pad(d.period.month)})`),
      `Rule status: ${d.rule.status}. See the app for the source.`));
  }
  const holidays = i.holidays.map((h) => ev(`holiday-${h.id}@payroll`,
    h.date, h.date, `${h.kind === "public" ? "Public" : "Company"} ` +
    `holiday: ${h.name}`));
  return [...leaveEvents(i), ...holidays];
}

const basic = (d: Date) => d.toISOString().replace(/[-:]/g, "")
  .replace(/\.\d{3}/, "");
const dateOnly = (d: string) => d.replace(/-/g, "");

function vevent(e: IcsEvent, stamp: string): string[] {
  return ["BEGIN:VEVENT", `UID:${escapeIcsText(e.uid)}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateOnly(e.start)}`,
    `DTEND;VALUE=DATE:${dateOnly(addDays(e.endInclusive, 1))}`,
    `SUMMARY:${escapeIcsText(e.summary)}`,
    ...(e.description === undefined ? []
      : [`DESCRIPTION:${escapeIcsText(e.description)}`]),
    "TRANSP:TRANSPARENT", "END:VEVENT"];
}

/** Pure: the iCalendar text (CRLF, folded at 75 octets). */
export function toIcsFeed(name: string, events: IcsEvent[], stamp: Date)
  : string {
  const s = basic(stamp);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//payroll//feed//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    ...events.flatMap((e) => vevent(e, s)), "END:VCALENDAR"];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
