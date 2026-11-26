import { addDays, daysBetween } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural, type DisplayDate } from "./display";
import { AL_AIN, HQ, KHALIDIYA } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import { FIRE_BRIEFING } from "./wpd-talent";
import {
  jobTitleText,
  placeText,
  shortDateOf,
  shortDateText,
} from "./wp3";

/**
 * WPE safety and cover: the health insurance register (P46), the safety
 * incident log (P48), ILOE subscription status (P52), policy versions
 * and who has read them (P53) and the incidents report (E14).
 * FICTIONAL sample data. Nobody is typed by name: people are picked by
 * job and branch, statuses come from joining dates, card numbers are
 * masked and made from the employee number. No premium, quote or fee
 * appears anywhere. ILOE statuses are our reading and are not sent to
 * any authority.
 */

const active = (c: DemoCompany): DemoEmployee[] =>
  c.employees.filter((e) => e.leavingDate === null);
const numberOf = (e: DemoEmployee): number => Number(e.id.slice(4));
const byJob = (c: DemoCompany, job: string, place?: string): DemoEmployee =>
  active(c).find((e) => e.jobKey === job &&
    (place === undefined || e.location === place))!;
const nameOf = (c: DemoCompany, id: string): string =>
  c.employees.find((e) => e.id === id)!.fullName;
const daysIn = (e: DemoEmployee): number =>
  daysBetween(e.joiningDate, AS_OF);

/** A joiner counts as new for this many days (the 30-day check-in). */
export const NEW_JOINER_DAYS = 30;

/* ---------------------------------------------------------------- *
 * P46 Health insurance
 * ---------------------------------------------------------------- */

export type CoverStatus = "covered" | "card-pending" | "ended";

export const INSURER = "Zarqan Demo Insurance (fictional)";
export const COVER_RENEWAL = "2026-12-31";
export const INSURANCE_BASIS = "A register of who is covered. It holds no " +
  "premiums and no quotes. Card numbers are masked, and the sample " +
  "cards stand in until the insurer's list is loaded.";

export interface CoverRow {
  id: string;
  employeeId: string;
  name: string;
  jobText: string;
  placeText: string;
  status: CoverStatus;
  /** The last four digits only: "•••• 4821", or null before issue. */
  cardMasked: string | null;
  startsOn: DisplayDate;
  endsOn: DisplayDate | null;
  renewalOn: DisplayDate;
  display: { status: string; card: string; renewal: string };
}

const WORD: Record<CoverStatus, string> = { covered: "Covered",
  "card-pending": "Card pending", ended: "Cover ended" };

/** Four digits from the employee number: sample, never a real card. */
const lastFour = (e: DemoEmployee): string =>
  String((numberOf(e) * 7919 + 1031) % 9000 + 1000);

/** Everyone who has joined, one row each; a leaver's cover has ended. */
export function coverRows(c: DemoCompany): CoverRow[] {
  const renewal = shortDateOf(COVER_RENEWAL);
  return c.employees.filter((e) => e.joiningDate <= AS_OF).map((e) => {
    const status: CoverStatus = e.leavingDate !== null ? "ended"
      : daysIn(e) < NEW_JOINER_DAYS ? "card-pending" : "covered";
    const card = status === "card-pending" ? null : `•••• ${lastFour(e)}`;
    return { id: `cov-${e.id}`, employeeId: e.id, name: e.fullName,
      jobText: jobTitleText(e.jobKey), placeText: placeText(e.location),
      status, cardMasked: card, startsOn: shortDateOf(e.joiningDate),
      endsOn: e.leavingDate === null ? null : shortDateOf(e.leavingDate),
      renewalOn: renewal, display: { status: status === "ended"
        ? `Cover ended ${shortDateText(e.leavingDate!)}` : WORD[status],
      card: card ?? "Not issued yet",
      renewal: `Renews ${renewal.display}` } };
  });
}

/* ---------------------------------------------------------------- *
 * P48 Safety incidents
 * ---------------------------------------------------------------- */

export type Severity = "low" | "medium" | "high";
export type IncidentStatus = "open" | "action-taken" | "closed";

export const SEVERITY_WORD: Record<Severity, string> = { low: "Low",
  medium: "Medium", high: "High" };
export const INCIDENT_WORD: Record<IncidentStatus, string> = {
  open: "Open", "action-taken": "Action taken", closed: "Closed" };

export interface IncidentAction { on: DisplayDate; text: string;
  byId: string; byName: string }

export interface IncidentView {
  id: string;
  title: string;
  what: string;
  severity: Severity;
  severityWord: string;
  status: IncidentStatus;
  happenedOn: DisplayDate;
  placeText: string;
  involvedId: string;
  involvedName: string;
  reportedById: string;
  reportedByName: string;
  actions: IncidentAction[];
  display: { when: string; who: string; actions: string };
}

interface Seed { id: string; title: string; what: string; severity: Severity;
  status: IncidentStatus; on: string; place: string; who: string;
  reporter: string; actions: [string, string, string][] }

/** Who each seed names: a job at a place, so it holds for every seed. */
function seeds(c: DemoCompany): Seed[] {
  const hrMgr = byJob(c, "hr-manager").id;
  const hrOff = byJob(c, "hr-officer").id;
  const alAinMgr = byJob(c, "branch-manager", AL_AIN).id;
  const khalMgr = byJob(c, "branch-manager", KHALIDIYA).id;
  const clerk = byJob(c, "archive-clerk").id;
  const cable = byJob(c, "operations-officer").id;
  const teller = active(c).find((e) => e.jobKey === "teller" &&
    e.location === KHALIDIYA && e.cases.length === 0)!.id;
  const slipper = byJob(c, "customer-service-officer", AL_AIN).id;
  const wheel = byJob(c, "payments-officer").id;
  const ops = byJob(c, "operations-manager").id;
  return [
    { id: "inc-001", title: "Loose cable under a desk",
      what: "A network cable ran across the walkway in the operations " +
        "area. Nobody fell.", severity: "low", status: "closed",
      on: "2026-07-08", place: HQ, who: cable, reporter: ops,
      actions: [["2026-07-09", "Cable moved into a floor channel.", hrOff]] },
    { id: "inc-002", title: "Wet floor, no warning sign",
      what: "The floor was wet after cleaning and the sign was missing. " +
        "A teller stumbled and was not hurt.", severity: "low",
      status: "closed", on: "2026-08-19", place: KHALIDIYA, who: teller,
      reporter: khalMgr, actions: [["2026-08-20",
        "Cleaners reminded to leave the sign until the floor is dry.",
        khalMgr]] },
    { id: "inc-003", title: "Slip at the entrance after rain",
      what: "A customer service officer slipped on the wet tiles at the " +
        "branch entrance and bruised a wrist. First aid was given.",
      severity: "medium", status: "closed", on: "2026-09-14",
      place: AL_AIN, who: slipper, reporter: alAinMgr,
      actions: [["2026-09-14", "First aid given at the branch.", alAinMgr],
        ["2026-09-15", "Non-slip mat placed at the entrance.", alAinMgr],
        ["2026-09-21", "Entrance checked after rain; nothing further.",
          hrMgr]] },
    { id: "inc-004", title: "Back strain lifting archive boxes",
      what: "The archive clerk strained their back lifting boxes from a " +
        "high shelf.", severity: "medium", status: "action-taken",
      on: "2026-10-02", place: HQ, who: clerk, reporter: ops,
      actions: [["2026-10-05", "Trolley ordered; lifting guidance sent " +
        "to the archive team.", hrMgr]] },
    { id: "inc-005", title: "Fire drill walk-through: stairwell door",
      what: "On the walk-through before the planned drill, the stairwell " +
        "door was found propped open. It was closed at once.",
      severity: "low", status: "open", on: "2026-10-14", place: HQ,
      who: hrOff, reporter: hrMgr,
      actions: [["2026-10-14", "Door closed; staff to be reminded at the " +
        `drill on ${shortDateText(FIRE_BRIEFING.on)} at ` +
        `${FIRE_BRIEFING.time}.`, hrMgr]] },
    { id: "inc-006", title: "Chair with a broken arm rest",
      what: "A teller reported a broken arm rest on a counter chair. " +
        "No injury.", severity: "low", status: "open", on: "2026-10-22",
      place: KHALIDIYA, who: teller, reporter: khalMgr, actions: [] },
    { id: "inc-007", title: "Hot water spill in the pantry",
      what: "A kettle was knocked over in the head office pantry. " +
        "No one was hurt.", severity: "low", status: "closed",
      on: "2026-09-03", place: HQ, who: wheel, reporter: hrOff,
      actions: [["2026-09-04", "Kettle moved to a stable shelf.", hrOff]] },
  ];
}

/** The log, newest first. */
export function incidents(c: DemoCompany): IncidentView[] {
  return seeds(c).map((x): IncidentView => {
    const actions = x.actions.map(([on, text, by]): IncidentAction =>
      ({ on: shortDateOf(on), text, byId: by, byName: nameOf(c, by) }));
    return { id: x.id, title: x.title, what: x.what, severity: x.severity,
      severityWord: SEVERITY_WORD[x.severity], status: x.status,
      happenedOn: shortDateOf(x.on), placeText: placeText(x.place),
      involvedId: x.who, involvedName: nameOf(c, x.who),
      reportedById: x.reporter, reportedByName: nameOf(c, x.reporter),
      actions, display: { when: `${shortDateText(x.on)}, ` +
        placeText(x.place), who: nameOf(c, x.who),
      actions: actions.length === 0 ? "No action yet"
        : plural(actions.length, "action", "actions") } };
  }).sort((a, b) => b.happenedOn.iso.localeCompare(a.happenedOn.iso) ||
    b.id.localeCompare(a.id));
}

/* ---------------------------------------------------------------- *
 * E14 Incidents report
 * ---------------------------------------------------------------- */

export interface IncidentMonth { monthIso: string; monthText: string;
  low: number; medium: number; high: number; total: number;
  open: number }

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/**
 * Incidents by month and severity, July to the demo's month. `closed`
 * names incident ids the viewer closed in this visit, so the open
 * column can follow the log.
 */
export function incidentsByMonth(c: DemoCompany,
  closed: readonly string[] = []): IncidentMonth[] {
  const all = incidents(c);
  const [y, m] = AS_OF.split("-").map(Number) as [number, number];
  const out: IncidentMonth[] = [];
  for (let k = 7; k <= m; k++) {
    const key = `${y}-${String(k).padStart(2, "0")}`;
    const mine = all.filter((i) => i.happenedOn.iso.startsWith(key));
    const n = (s: Severity) => mine.filter((i) => i.severity === s).length;
    out.push({ monthIso: key, monthText: `${MONTHS[k - 1]} ${y}`,
      low: n("low"), medium: n("medium"), high: n("high"),
      total: mine.length, open: mine.filter((i) =>
        i.status !== "closed" && !closed.includes(i.id)).length });
  }
  return out;
}

/* ---------------------------------------------------------------- *
 * P52 ILOE
 * ---------------------------------------------------------------- */

export type IloeStatus = "subscribed" | "due" | "exempt";

export const ILOE_BASIS = "ILOE is the unemployment insurance scheme. " +
  "These statuses are as we read the rules, and nothing here is sent to " +
  "any authority. Subscribed or due follows the joining date; the sample " +
  "stands in until subscriptions are loaded. No fees are shown.";
export const ILOE_EXEMPT_NOTE = "As we read the rules, a few groups are " +
  "exempt (for example people under 18 and domestic workers). Nobody at " +
  "the bank falls in one of them.";

export interface IloeRow {
  id: string;
  employeeId: string;
  name: string;
  jobText: string;
  status: IloeStatus;
  since: DisplayDate | null;
  display: { status: string; note: string };
}

export function iloeRows(c: DemoCompany): IloeRow[] {
  return active(c).map((e): IloeRow => {
    const due = daysIn(e) < NEW_JOINER_DAYS;
    const status: IloeStatus = due ? "due" : "subscribed";
    return { id: `iloe-${e.id}`, employeeId: e.id, name: e.fullName,
      jobText: jobTitleText(e.jobKey), status,
      since: due ? null : shortDateOf(e.joiningDate),
      display: { status: due ? "Due" : "Subscribed",
        note: due ? `Joined ${shortDateText(e.joiningDate)}; to be ` +
          "subscribed" : `Since ${shortDateText(e.joiningDate)}` } };
  });
}

/* ---------------------------------------------------------------- *
 * P53 Policy versions
 * ---------------------------------------------------------------- */

export interface PolicyVersion { version: string; effectiveOn: DisplayDate }

interface PolicySeed { id: string; name: string; version: string;
  on: string; ownerJob: string; summary: string;
  before: [string, string] }

const POLICIES: readonly PolicySeed[] = [
  { id: "pol-handbook", name: "Staff handbook", version: "4.2",
    on: "2026-01-01", ownerJob: "hr-manager", before: ["4.1", "2025-01-01"],
    summary: "How working at the bank works: hours, conduct at work, " +
      "pay days and who to ask." },
  { id: "pol-conduct", name: "Code of conduct", version: "5.0",
    on: "2026-01-01", ownerJob: "compliance-officer",
    before: ["4.3", "2024-07-01"],
    summary: "How staff deal with customers, gifts, conflicts of " +
      "interest and speaking up." },
  { id: "pol-leave", name: "Leave and absence policy", version: "3.1",
    on: "2026-03-01", ownerJob: "hr-manager", before: ["3.0", "2025-03-01"],
    summary: "How to ask for time off, who decides, and what to do when " +
      "you are ill." },
  { id: "pol-data", name: "Customer data protection policy",
    version: "2.3", on: "2026-05-01", ownerJob: "it-manager",
    before: ["2.2", "2025-09-01"],
    summary: "How customer information is kept, shared and deleted." },
  { id: "pol-expenses", name: "Expenses and travel policy", version: "1.4",
    on: "2026-07-01", ownerJob: "finance-manager",
    before: ["1.3", "2026-01-01"],
    summary: "What can be claimed, with what proof, and by when." },
  { id: "pol-safety", name: "Health and safety policy", version: "2.0",
    on: "2026-10-01", ownerJob: "hr-manager", before: ["1.2", "2025-04-01"],
    summary: "Fire drills, first aid, how to report an incident and who " +
      "looks into it." },
];

export interface AckRow {
  employeeId: string;
  name: string;
  jobText: string;
  /** Read and acknowledged, or still to do. */
  done: boolean;
  /** Joined after the policy took effect: it is part of joining. */
  newJoiner: boolean;
  doneOn: DisplayDate | null;
  display: { status: string };
}

export interface PolicyView {
  id: string;
  name: string;
  version: string;
  summary: string;
  effectiveOn: DisplayDate;
  ownerId: string;
  ownerName: string;
  ownerRole: string;
  history: PolicyVersion[];
  acks: AckRow[];
  read: number;
  total: number;
  display: { version: string; read: string };
}

/** About one in five has not yet read a policy; the newest, more. */
function readOn(e: DemoEmployee, p: PolicySeed, i: number): string | null {
  const gap = p.on >= "2026-10-01" ? 3 : 6;
  if ((numberOf(e) + i) % gap === 0) return null;
  const on = addDays(p.on, 3 + (numberOf(e) * 5 + i) % 18);
  const after = on < e.joiningDate ? addDays(e.joiningDate, 10) : on;
  return after > AS_OF ? null : after;
}

export function policies(c: DemoCompany): PolicyView[] {
  return POLICIES.map((p, i): PolicyView => {
    const owner = byJob(c, p.ownerJob);
    const acks = active(c).map((e): AckRow => {
      const on = readOn(e, p, i);
      return { employeeId: e.id, name: e.fullName,
        jobText: jobTitleText(e.jobKey), done: on !== null,
        newJoiner: e.joiningDate > p.on,
        doneOn: on === null ? null : shortDateOf(on),
        display: { status: on === null ? "Not yet"
          : `Read and acknowledged ${shortDateText(on)}` } };
    });
    const read = acks.filter((a) => a.done).length;
    return { id: p.id, name: p.name, version: p.version,
      summary: p.summary, effectiveOn: shortDateOf(p.on),
      ownerId: owner.id, ownerName: owner.fullName,
      ownerRole: jobTitleText(owner.jobKey),
      history: [{ version: p.version, effectiveOn: shortDateOf(p.on) },
        { version: p.before[0], effectiveOn: shortDateOf(p.before[1]) }],
      acks, read, total: acks.length,
      display: { version: `Version ${p.version}`,
        read: `${read} of ${acks.length} read and acknowledged` } };
  });
}
