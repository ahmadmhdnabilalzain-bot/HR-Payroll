import { addDays, daysBetween, daysInMonth } from "@payroll/engine";
import { AS_OF, PAY_CALENDAR, isWorkingDay } from "./calendar";
import { dateOf, plural, type DisplayDate } from "./display";
import type { DemoCompany, DemoEmployee } from "./types";
import { ACCESS_ROLES } from "./wp9";
import { trainingRecords } from "./wpd-talent";
import { holidays } from "./wpd-templates";

/**
 * WPE requests: profile change requests, travel and air tickets, the
 * HR help desk, access requests and the calendar feed. FICTIONAL
 * sample data. Nothing is typed per person except a few fixed seeds
 * (a staff number and a reason); everything else comes from the
 * roster. Records only: no money moves here and nothing is claimed as
 * decided by an outside body. Unlocks map rows P32, P36, P37, E06,
 * E07, E12, E15.
 */

const named = (c: DemoCompany, id: string): DemoEmployee | undefined =>
  c.employees.find((e) => e.id === id);
const nameOf = (c: DemoCompany, id: string): string =>
  named(c, id)?.fullName ?? id;
const active = (c: DemoCompany): DemoEmployee[] =>
  c.employees.filter((e) => e.leavingDate === null);
/** The employee the demo's "employee" view stands for. */
const personaOf = (c: DemoCompany): DemoEmployee =>
  c.employees.find((e) => e.cases.includes("overtime")) ?? c.employees[0]!;
/** The HR officer the queues are assigned to (as in papers.ts). */
export const REQUESTS_OWNER = "emp-029";

/* ---------------------------------------------------------------- *
 * P32 Profile change requests
 * ---------------------------------------------------------------- */

export type ChangeBase = "open" | "done";

export interface ProfileChange {
  id: string;
  employeeId: string;
  fieldId: string;
  field: string;
  current: string;
  proposed: string;
  /** What HR asks to see before updating the record. */
  proof: string;
  raisedOn: DisplayDate;
  base: ChangeBase;
  assignedTo: string;
  display: { name: string; raised: string; waiting: string };
}

/** What a person can ask to change, and the proof HR asks for. */
export const CHANGE_FIELDS: readonly { id: string; label: string;
  proof: string }[] = [
  { id: "mobile", label: "Mobile number", proof: "None needed" },
  { id: "address", label: "Home address",
    proof: "Tenancy contract or a recent utility bill" },
  { id: "emergency", label: "Emergency contact", proof: "None needed" },
  { id: "marital", label: "Marital status",
    proof: "Marriage or divorce certificate" },
  { id: "name", label: "Spelling of my name",
    proof: "Passport copy" },
  { id: "dependant", label: "A dependant (add or remove)",
    proof: "Birth or marriage certificate" },
];

type ChangeSeed = [string, string, string, string, string, ChangeBase];

/** [employee, field, current, proposed, raised, base]. */
const CHANGES: readonly ChangeSeed[] = [
  ["emp-021", "address", "Al Reem Island, Abu Dhabi",
    "Khalifa City, Abu Dhabi", "2026-10-22", "open"],
  ["@persona", "mobile", "+971 50 555 0147", "+971 55 555 0163",
    "2026-10-26", "open"],
  ["emp-002", "marital", "Single", "Married", "2026-10-24", "open"],
  ["emp-024", "name", "Mohamed", "Muhammad", "2026-10-23", "open"],
  ["emp-018", "emergency", "Sister, +971 52 555 0119",
    "Brother, +971 56 555 0172", "2026-10-12", "done"],
  ["emp-031", "mobile", "+971 54 555 0128", "+971 54 555 0185",
    "2026-10-09", "done"],
];

export function profileChanges(c: DemoCompany): ProfileChange[] {
  return CHANGES.flatMap(([who, fieldId, current, proposed, on, base], i) => {
    const e = who === "@persona" ? personaOf(c) : named(c, who);
    const f = CHANGE_FIELDS.find((x) => x.id === fieldId)!;
    if (e === undefined) return [];
    return [{ id: `pc-${String(i + 1).padStart(3, "0")}`,
      employeeId: e.id, fieldId, field: f.label, current, proposed,
      proof: f.proof, raisedOn: dateOf(on), base,
      assignedTo: REQUESTS_OWNER, display: { name: e.fullName,
        raised: dateOf(on).display, waiting: base === "done" ? ""
          : plural(daysBetween(on, AS_OF), "day", "days") } }];
  });
}

/* ---------------------------------------------------------------- *
 * P36 Travel and air tickets
 * ---------------------------------------------------------------- */

export const TICKET_BASIS = "Sample policy: one economy return ticket " +
  "to the home country every 12 months for staff who are not UAE " +
  "nationals; grade 7 and above fly business. It stands in until the " +
  "bank's own ticket policy is entered.";

export type TravelBase = "open" | "booked" | "done";

export interface TicketEntitlement {
  employeeId: string;
  name: string;
  eligible: boolean;
  homeCountry: string;
  cabin: "Economy" | "Business" | "";
  /** The next 12-month anniversary of joining, on or after today. */
  dueOn: DisplayDate | null;
  daysLeft: number | null;
  status: "soon" | "later" | "none";
  display: { cabin: string; due: string; status: string };
}

const anniversary = (joined: string, year: number): string => {
  const [, m = "01", d = "01"] = joined.split("-");
  return `${String(year)}-${m}-${m === "02" && d === "29" ? "28" : d}`;
};

/** The first anniversary of joining that is a year or more away. */
function nextAnniversary(joined: string, on: string): string {
  const joinYear = Number(joined.slice(0, 4));
  let y = Math.max(joinYear + 1, Number(on.slice(0, 4)));
  while (anniversary(joined, y) < on) y += 1;
  return anniversary(joined, y);
}

export function ticketEntitlements(c: DemoCompany): TicketEntitlement[] {
  return active(c).map((e): TicketEntitlement => {
    const eligible = e.workerClass !== "uae-national";
    const due = eligible ? nextAnniversary(e.joiningDate, AS_OF) : null;
    const left = due === null ? null : daysBetween(AS_OF, due);
    const cabin = !eligible ? "" : e.grade >= 7 ? "Business" : "Economy";
    const status = left === null ? "none" : left <= 60 ? "soon" : "later";
    return { employeeId: e.id, name: e.fullName, eligible,
      homeCountry: e.nationality, cabin, dueOn: due === null ? null
        : dateOf(due), daysLeft: left, status,
      display: { cabin: cabin === "" ? "Not included" : cabin,
        due: due === null ? "Not included" : dateOf(due).display,
        status: status === "none" ? "Not included"
          : status === "soon" ? `Due in ${plural(left!, "day", "days")}`
            : `In ${plural(left!, "day", "days")}` } };
  });
}

export interface TravelRequest {
  id: string;
  employeeId: string;
  title: string;
  homeCountry: string;
  cabin: string;
  departOn: DisplayDate;
  returnOn: DisplayDate;
  raisedOn: DisplayDate;
  base: TravelBase;
  assignedTo: string;
  display: { name: string; trip: string; raised: string };
}

/** [place in the eligible list, days to depart, stay, raised, base]. */
const TRIPS: readonly [number, number, number, string,
  TravelBase][] = [
  [0, 52, 14, "2026-10-26", "open"], [2, 66, 16, "2026-10-19", "open"],
  [4, 38, 12, "2026-10-14", "booked"],
  [6, 24, 10, "2026-10-08", "booked"],
  [8, -40, 14, "2026-08-28", "done"],
];

export function travelRequests(c: DemoCompany): TravelRequest[] {
  const persona = personaOf(c).id;
  const pool = ticketEntitlements(c).filter((x) => x.eligible)
    .sort((a, b) => (a.employeeId === persona ? -1 : 0) -
      (b.employeeId === persona ? -1 : 0) ||
      a.employeeId.localeCompare(b.employeeId));
  return TRIPS.flatMap(([at, ahead, stay, raised, base], i) => {
    const t = pool[at % Math.max(pool.length, 1)];
    if (t === undefined) return [];
    const depart = addDays(AS_OF, ahead);
    const back = addDays(depart, stay);
    return [{ id: `tv-${String(i + 1).padStart(3, "0")}`,
      employeeId: t.employeeId, title: "Annual home-leave ticket",
      homeCountry: t.homeCountry, cabin: t.cabin,
      departOn: dateOf(depart), returnOn: dateOf(back),
      raisedOn: dateOf(raised), base, assignedTo: REQUESTS_OWNER,
      display: { name: t.name, trip: `${dateOf(depart).display} to ` +
        dateOf(back).display, raised: dateOf(raised).display } }];
  });
}

/* ---------------------------------------------------------------- *
 * P37 HR help desk
 * ---------------------------------------------------------------- */

export const TICKET_CATEGORIES: readonly string[] = ["Payslip", "Leave",
  "Letters", "Bank details", "Access", "Other"];

export type TicketBase = "open" | "waiting" | "solved";

export interface TicketMessage {
  /** "employee" wrote it, or "hr" answered. */
  from: "employee" | "hr";
  byId: string;
  on: DisplayDate;
  text: string;
}

export interface HelpTicket {
  id: string;
  subject: string;
  category: string;
  priority: "Normal" | "High";
  employeeId: string;
  raisedOn: DisplayDate;
  base: TicketBase;
  assignedTo: string;
  thread: TicketMessage[];
  display: { name: string; raised: string; waiting: string };
}

type Say = [("employee" | "hr"), string, string];
type TicketSeed = [string, string, string, "Normal" | "High", string,
  TicketBase, Say[]];

/** [employee, subject, category, priority, raised, base, thread]. */
const TICKETS: readonly TicketSeed[] = [
  ["@persona", "What is the overtime line on my payslip?", "Payslip",
    "Normal", "2026-10-26", "open", [["employee", "2026-10-26",
      "Could you explain the overtime line on my October payslip? I " +
      "would like to know which days it counts."]]],
  ["emp-023", "My salary did not reach my new bank", "Bank details",
    "High", "2026-10-25", "waiting", [["employee", "2026-10-25",
      "I changed my bank last month and the salary went to the old " +
      "account."], ["hr", "2026-10-26", "Sorry about that. Please send " +
      "a bank letter with your new IBAN and we will fix it for the " +
      "next run."]]],
  ["emp-024", "How many leave days do I have left?", "Leave", "Normal",
    "2026-10-23", "solved", [["employee", "2026-10-23",
      "Can you tell me my annual leave balance?"], ["hr", "2026-10-23",
      "It is on My leave, under your name. It counts from your joining " +
      "date."], ["employee", "2026-10-24", "Found it, thank you."]]],
  ["emp-002", "Letter for the embassy", "Letters", "Normal",
    "2026-10-22", "waiting", [["employee", "2026-10-22",
      "I need a no-objection letter for a visa application."],
    ["hr", "2026-10-23", "Which embassy is it addressed to? We will " +
      "put it on the letter."]]],
  ["emp-031", "I cannot open my documents page", "Access", "Normal",
    "2026-10-21", "open", [["employee", "2026-10-21",
      "My documents page shows an empty list since this morning."]]],
  ["emp-018", "Change my name on the payslip", "Payslip", "Normal",
    "2026-10-15", "solved", [["employee", "2026-10-15",
      "My name is spelt wrong on the payslip."], ["hr", "2026-10-16",
      "Fixed in your record. It shows from the next payslip."]]],
  ["emp-021", "Question about the work visa renewal", "Other", "High",
    "2026-10-20", "open", [["employee", "2026-10-20",
      "My residence visa runs out soon. Who starts the renewal?"]]],
];

export function helpTickets(c: DemoCompany): HelpTicket[] {
  return TICKETS.flatMap(([who, subject, category, priority, on, base,
    say], i) => {
    const e = who === "@persona" ? personaOf(c) : named(c, who);
    if (e === undefined) return [];
    const thread = say.map(([from, d, text]): TicketMessage => ({ from,
      byId: from === "hr" ? REQUESTS_OWNER : e.id, on: dateOf(d), text }));
    return [{ id: `tk-${String(1041 + i)}`, subject, category, priority,
      employeeId: e.id, raisedOn: dateOf(on), base,
      assignedTo: REQUESTS_OWNER, thread, display: { name: e.fullName,
        raised: dateOf(on).display, waiting: base === "solved" ? ""
          : plural(daysBetween(on, AS_OF), "day", "days") } }];
  });
}

/* ---------------------------------------------------------------- *
 * E15 Access requests
 * ---------------------------------------------------------------- */

export type AccessBase = "open" | "done";

export interface AccessRequest {
  id: string;
  employeeId: string;
  roleId: string;
  roleLabel: string;
  reason: string;
  raisedOn: DisplayDate;
  base: AccessBase;
  display: { name: string; raised: string };
}

/** Roles a person can ask for (the demo's roles, none of them admin
 * rights over pay). */
export const REQUESTABLE_ROLES: readonly { id: string;
  label: string }[] = ACCESS_ROLES.filter((r) =>
  r.id !== "employee" && r.id !== "general-manager" &&
  r.id !== "finance-clerk").map((r) => ({ id: r.id, label: r.label }));

type AccessSeed = [string, string, string, string, AccessBase];

/** [employee, role, reason, raised, base]. */
const ACCESS: readonly AccessSeed[] = [
  ["emp-024", "finance-read-only", "I reconcile the month-end reports.",
    "2026-10-26", "open"],
  ["emp-018", "line-manager", "I now lead the payments desk.",
    "2026-10-22", "open"],
  ["emp-031", "hr-officer", "Covering HR while a colleague is away.",
    "2026-10-05", "done"],
];

export function accessRequests(c: DemoCompany): AccessRequest[] {
  return ACCESS.flatMap(([who, roleId, reason, on, base], i) => {
    const e = named(c, who);
    const role = ACCESS_ROLES.find((r) => r.id === roleId);
    if (e === undefined || role === undefined) return [];
    return [{ id: `ar-${String(i + 1).padStart(3, "0")}`,
      employeeId: e.id, roleId, roleLabel: role.label, reason,
      raisedOn: dateOf(on), base, display: { name: e.fullName,
        raised: dateOf(on).display } }];
  });
}

/* ---------------------------------------------------------------- *
 * E12 Calendar feed
 * ---------------------------------------------------------------- */

export type MarkKind = "holiday" | "payday" | "cutoff" | "training";

export interface CalendarMark {
  id: string;
  kind: MarkKind;
  label: string;
  from: string;
  to: string;
  /** A person the mark is for (training); null for the company. */
  employeeId: string | null;
  display: { when: string; note: string };
}

const NOTE_SAMPLE = "Planned date.";

/** The last working day of a month: the demo's payday. */
function paydayOf(ym: string): string {
  const [y = 0, m = 1] = ym.split("-").map(Number);
  let d = addDays(`${String(m === 12 ? y + 1 : y)}-` +
    `${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`, -1);
  while (!isWorkingDay(d)) d = addDays(d, -1);
  return d;
}

/** Marks that touch a month (YYYY-MM): holidays, payday, training. */
export function calendarMarks(c: DemoCompany, ym: string)
  : CalendarMark[] {
  const [y = 0, m = 1] = ym.split("-").map(Number);
  const first = `${ym}-01`;
  const lastDay = `${ym}-${String(daysInMonth(y, m))}`;
  const hits = (from: string, to: string): boolean =>
    from <= lastDay && to >= first;
  const marks: CalendarMark[] = holidays(c).filter((h) =>
    hits(h.from, h.to)).map((h) => ({ id: h.id, kind: "holiday",
    label: h.name, from: h.from, to: h.to, employeeId: null,
    display: { when: h.display.dates, note: h.display.note } }));
  const pay = ym === AS_OF.slice(0, 7) ? PAY_CALENDAR.payday
    : paydayOf(ym);
  marks.push({ id: `pay-${ym}`, kind: "payday", label: "Payday",
    from: pay, to: pay, employeeId: null,
    display: { when: dateOf(pay).display, note: NOTE_SAMPLE } });
  if (hits(PAY_CALENDAR.cutOff, PAY_CALENDAR.cutOff)) {
    marks.push({ id: "cutoff-2026-10", kind: "cutoff",
      label: "Pay changes cut-off", from: PAY_CALENDAR.cutOff,
      to: PAY_CALENDAR.cutOff, employeeId: null,
      display: { when: dateOf(PAY_CALENDAR.cutOff).display,
        note: NOTE_SAMPLE } });
  }
  for (const r of trainingRecords(c)) {
    const on = r.sessionOn?.iso;
    if (on === undefined || !hits(on, on)) continue;
    marks.push({ id: r.id, kind: "training", label: r.courseName,
      from: on, to: on, employeeId: r.employeeId,
      display: { when: r.display.when, note: "Booked session" } });
  }
  return marks;
}
