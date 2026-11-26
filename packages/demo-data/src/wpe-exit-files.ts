import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  fils,
  GRATUITY_PACKS,
  mulDiv,
  requireParam,
  selectPack,
  type Fils,
  type OvertimeEntry,
  type RoundingMode,
} from "@payroll/engine";
import { AS_OF, isWorkingDay, weekday, workingDaysBetween } from "./calendar";
import { dateOf, displayDate, plural } from "./display";
import { payslipInput } from "./pay-inputs";
import { letters } from "./papers";
import { payslipWithoutPension } from "./pension";
import { LATE_GRACE_MINUTES } from "./time";
import type { DemoCompany, DemoEmployee } from "./types";
import {
  departmentText,
  jobTitleText,
  movesDataOf,
  offerViews,
} from "./wp3";

/**
 * WPE exit interviews, signatures, documents and the leave and
 * attendance extras (map rows P17, P35, P41, T03, T05, T06, T11, T12,
 * T15, T16, T23). FICTIONAL, derived from the employees, the leaver
 * checklist, the letters and offers, the leave balances and the
 * attendance. Money goes through the engine only; nothing is typed
 * per person except the sample requests marked as such.
 */

const live = (c: DemoCompany): DemoEmployee[] =>
  c.employees.filter((e) => e.leavingDate === null &&
    e.joiningDate <= AS_OF);
const byId = (c: DemoCompany, id: string): DemoEmployee =>
  c.employees.find((e) => e.id === id)!;
const runApproval = (c: DemoCompany) =>
  c.approvals.find((a) => a.kind === "pay-run")!;
const hrOf = (c: DemoCompany): string => runApproval(c).makerEmployeeId;
const gmOf = (c: DemoCompany): string => runApproval(c).checkerEmployeeId;

/* ---------------------------------------------------------------- *
 * P17 Exit interviews
 * ---------------------------------------------------------------- */

export interface ExitReason { id: string; label: string }

export const EXIT_REASONS: readonly ExitReason[] = [
  { id: "relocation", label: "Moving abroad" },
  { id: "pay", label: "Better pay elsewhere" },
  { id: "growth", label: "Career growth" },
  { id: "manager", label: "Relationship with the manager" },
  { id: "balance", label: "Work-life balance" },
  { id: "family", label: "Family reasons" },
  { id: "other", label: "Something else" },
];

export interface ExitQuestion { id: string; label: string }

/** Each is answered 1 (poor) to 5 (very good) in the form. */
export const EXIT_QUESTIONS: readonly ExitQuestion[] = [
  { id: "role", label: "The work itself" },
  { id: "manager", label: "Support from the manager" },
  { id: "pay", label: "Pay and benefits" },
  { id: "team", label: "The team" },
  { id: "return", label: "Would work here again" },
];

export const EXIT_SCALE = "1 is poor, 5 is very good";

export interface ExitInterview {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  department: string;
  interviewerId: string;
  interviewer: string;
  /** The held date, or the date planned. */
  on: { iso: string; display: string };
  held: boolean;
  lastWorkingDay: { iso: string; display: string };
  reasonId: string;
  /** The reason as written on the resignation record. */
  reasonNote: string;
  /** The sample interview keeps no answers; the form starts blank. */
  answersKept: boolean;
}

function reasonIdOf(text: string): string {
  const t = text.toLowerCase();
  if (/abroad|reloc|moving/.test(t)) return "relocation";
  if (/pay|salary|offer/.test(t)) return "pay";
  if (/career|growth|promot/.test(t)) return "growth";
  if (/family/.test(t)) return "family";
  return "other";
}

/** One row for each leaver: the held interview on the checklist. */
export function exitInterviews(c: DemoCompany): ExitInterview[] {
  const m = movesDataOf(c);
  return m.leavers.map((l) => {
    const item = l.items.find((i) => i.key === "exit-interview")!;
    const end = m.endings.find((x) => x.employeeId === l.employeeId);
    const e = byId(c, l.employeeId);
    const hr = byId(c, hrOf(c));
    return { id: `xi-${l.employeeId}`, employeeId: l.employeeId,
      name: l.personName, title: l.title,
      department: departmentText(e.departmentId),
      interviewerId: hr.id, interviewer: hr.fullName,
      on: item.doneOn ?? item.dueOn, held: item.doneOn !== null,
      lastWorkingDay: l.lastWorkingDay,
      reasonId: reasonIdOf(end?.reason ?? ""),
      reasonNote: end?.reason ?? "", answersKept: false };
  });
}

/** Staff an interview can still be planned for: everyone staying on. */
export function exitCandidates(c: DemoCompany)
  : { id: string; name: string; title: string }[] {
  return live(c).map((e) => ({ id: e.id, name: e.fullName,
    title: jobTitleText(e.jobKey) }));
}

/* ---------------------------------------------------------------- *
 * P35 Electronic signatures
 * ---------------------------------------------------------------- */

export const SIGNATURE_NOTE = "This is a demo of the signing steps. " +
  "A typed name is recorded with who and when; no legal validity is " +
  "claimed for it.";

export type SignBase = "not-requested" | "waiting" | "signed" | "declined";

export interface SignDoc {
  /** "letter:lt-2" or "offer:of-1". */
  id: string;
  kind: "letter" | "offer";
  sourceId: string;
  title: string;
  personName: string;
  reference: string;
  signerId: string | null;
  signerName: string;
  signerRole: string;
  base: SignBase;
  signedOn: { iso: string; display: string } | null;
}

const LETTER_TITLE: Record<string, string> = {
  "salary-certificate": "Salary certificate", noc: "No-objection letter",
  experience: "Experience letter" };

/** Letters and offers that carry, or can carry, a signature. */
export function signDocs(c: DemoCompany): SignDoc[] {
  const gm = byId(c, gmOf(c));
  const fromLetters = letters(c).map((l): SignDoc => ({
    id: `letter:${l.id}`, kind: "letter", sourceId: l.id,
    title: LETTER_TITLE[l.kind] ?? "Letter", personName: l.display.name,
    reference: l.reference.value, signerId: gm.id, signerName: gm.fullName,
    signerRole: jobTitleText(gm.jobKey),
    base: l.status === "issued" ? "signed"
      : l.status === "pending" ? "waiting" : "not-requested",
    signedOn: null }));
  const fromOffers = offerViews(c).map((o): SignDoc => ({
    id: `offer:${o.id}`, kind: "offer", sourceId: o.id,
    title: "Offer letter", personName: o.candidateName,
    reference: o.number, signerId: null, signerName: o.candidateName,
    signerRole: "Candidate",
    base: o.status === "accepted" ? "signed"
      : o.status === "sent" ? "waiting"
        : o.status === "declined" ? "declined" : "not-requested",
    signedOn: o.status === "accepted" ? o.respondedOn : null }));
  return [...fromLetters, ...fromOffers];
}

/* ---------------------------------------------------------------- *
 * P41 Documents and versions
 * ---------------------------------------------------------------- */

export const DOC_TYPES: readonly string[] = ["Employment contract",
  "Offer letter", "Residence visa", "Emirates ID", "Passport",
  "Certificate", "Medical report", "Other"];

export const FILES_NOTE = "Files you add stay in this browser tab only. " +
  "Nothing is sent anywhere, and a reload clears them.";

export interface FileVersion {
  version: number;
  fileName: string;
  /** Size in bytes; 0 for papers already on file before the demo. */
  bytes: number;
  note: string;
}

export interface OnFile {
  id: string;
  employeeId: string;
  name: string;
  docType: string;
  /** Version 1 of a paper already on file. */
  first: FileVersion;
  numberMasked: string;
  expires: { iso: string; display: string };
}

const KIND_TYPE: Record<string, string> = {
  "residence-visa": "Residence visa", "emirates-id": "Emirates ID",
  passport: "Passport" };

/** Papers on file (the three kinds with an expiry date). */
export function onFile(c: DemoCompany): OnFile[] {
  return c.documents.map((d) => {
    const e = byId(c, d.employeeId);
    const type = KIND_TYPE[d.kind] ?? "Other";
    return { id: d.id, employeeId: d.employeeId, name: e.fullName,
      docType: type, numberMasked: d.number.masked,
      expires: dateOf(d.expiresOn),
      first: { version: 1, fileName: `${type} ${e.fullName}.pdf`,
        bytes: 0, note: "On file before the demo" } };
  });
}

/* ---------------------------------------------------------------- *
 * T05 Leave encashment, T06 Leave liability
 * ---------------------------------------------------------------- */

export const ENCASH_NOTE = "Days times one day of basic salary. A day is " +
  "basic salary divided by the divisor of the leave pay rule (our " +
  "choice, not set by the law). Paid with the next run as a separate " +
  "line; the October run does not change.";

function leavePayRule(): { divisor: bigint; mode: RoundingMode } {
  const pack = selectPack(GRATUITY_PACKS, AS_OF);
  return { divisor: BigInt(Number(requireParam(pack, "leavePayDivisor")
    .value)), mode: requireParam(pack, "roundingMode").value as
    RoundingMode };
}

/** One day of basic salary, through the pack's divisor. */
export function dailyRate(c: DemoCompany, employeeId: string): Fils {
  const r = leavePayRule();
  return mulDiv(byId(c, employeeId).basicMonthly, 1n, r.divisor, r.mode);
}

/** Basic salary for a number of half days, rounded once. */
function basicFor(e: DemoEmployee, halves: number): Fils {
  const r = leavePayRule();
  return mulDiv(e.basicMonthly, BigInt(halves), 2n * r.divisor, r.mode);
}

export interface Encashable { employeeId: string; name: string;
  title: string; availableHalves: number; availableDays: number;
  rate: Fils; rateText: string }

/** Everyone still employed with unused annual days (not the leaver). */
export function encashable(c: DemoCompany): Encashable[] {
  return c.leaveBalances.flatMap((b) => {
    const e = byId(c, b.employeeId);
    if (e.leavingDate !== null || b.availableHalves === null ||
      b.availableHalves <= 0) return [];
    const rate = dailyRate(c, e.id);
    return [{ employeeId: e.id, name: e.fullName,
      title: jobTitleText(e.jobKey), availableHalves: b.availableHalves,
      availableDays: b.availableHalves / 2, rate,
      rateText: "one day of basic salary" }];
  });
}

export interface EncashQuote { employeeId: string; halves: number;
  days: number; rate: Fils; amount: Fils; ok: boolean; message: string }

/** The amount for a request, or why it cannot be made. */
export function encashQuote(c: DemoCompany, employeeId: string,
  halves: number): EncashQuote {
  const e = c.employees.find((x) => x.id === employeeId);
  const ok0 = encashable(c).find((x) => x.employeeId === employeeId);
  const rate = e === undefined ? fils(0n) : dailyRate(c, employeeId);
  const fail = (message: string): EncashQuote => ({ employeeId, halves,
    days: halves / 2, rate, amount: fils(0n), ok: false, message });
  if (e === undefined || ok0 === undefined) {
    return fail("This person has no unused annual days to turn into pay.");
  }
  if (!Number.isInteger(halves) || halves < 1) {
    return fail("Ask for at least half a day, in whole or half days.");
  }
  if (halves > ok0.availableHalves) {
    return fail(`Only ${ok0.availableDays} days are left.`);
  }
  return { employeeId, halves, days: halves / 2, rate,
    amount: basicFor(e, halves), ok: true, message: "" };
}

export interface AskStepSeed { stage: "hr" | "gm"; by: string;
  on: { iso: string; display: string } }

export interface AskSeed { id: string; kind: "encash" | "correction";
  employeeId: string; values: Record<string, string>;
  raisedBy: string; raisedOn: { iso: string; display: string };
  steps: AskStepSeed[] }

/**
 * Sample requests so each step of the flow has one: asked by the
 * employee and waiting for HR, and one HR has signed off that waits
 * for the General manager.
 */
export function askSeeds(c: DemoCompany): AskSeed[] {
  const hr = hrOf(c);
  return [
    { id: "enc-1", kind: "encash", employeeId: "emp-010",
      values: { halves: "10" }, raisedBy: "emp-010",
      raisedOn: dateOf("2026-10-26"), steps: [] },
    { id: "enc-2", kind: "encash", employeeId: "emp-020",
      values: { halves: "6" }, raisedBy: "emp-020",
      raisedOn: dateOf("2026-10-22"),
      steps: [{ stage: "hr", by: hr, on: dateOf("2026-10-23") }] },
  ];
}

export interface LiabilityRow { employeeId: string; name: string;
  title: string; days: number; rate: Fils; liability: Fils }

/** Unused annual leave priced like an encashment, for each person. */
export function leaveLiability(c: DemoCompany): LiabilityRow[] {
  return encashable(c).map((x) => ({ employeeId: x.employeeId,
    name: x.name, title: x.title, days: x.availableDays, rate: x.rate,
    liability: basicFor(byId(c, x.employeeId), x.availableHalves) }));
}

export const LIABILITY_NOTE = "Unused annual days at one day of basic " +
  "salary each, the same sum as leave encashment. Air tickets are not " +
  "set up, so none are counted.";

/* ---------------------------------------------------------------- *
 * T11 Attendance corrections
 * ---------------------------------------------------------------- */

export interface CheckDay { id: string; employeeId: string; name: string;
  date: { iso: string; display: string }; was: string; clock: string;
  dayValue: Fils; reason: string }

const hm = (stamp: string | null): string =>
  stamp === null ? "" : stamp.slice(11, 16);

/** October days that look wrong: unpaid absences and late arrivals. */
export function checkDays(c: DemoCompany): CheckDay[] {
  const out: CheckDay[] = [];
  for (const d of c.attendance) {
    const e = byId(c, d.employeeId);
    const late = d.status === "present" && d.clockIn !== null &&
      lateMinutes(d.clockIn, e) > LATE_GRACE_MINUTES;
    if (d.status !== "absent-unpaid" && !late) continue;
    out.push({ id: `${d.employeeId}|${d.date}`, employeeId: e.id,
      name: e.fullName, date: dateOf(d.date),
      was: d.status === "absent-unpaid" ? "Absent, unpaid"
        : "Late arrival",
      clock: d.status === "absent-unpaid" ? "No punches"
        : `In ${hm(d.clockIn)}, out ${hm(d.clockOut)}`,
      dayValue: dailyRate(c, e.id),
      reason: d.status === "absent-unpaid"
        ? "One day of basic salary is held back."
        : "Listed after the grace period." });
  }
  return out.sort((a, b) => a.date.iso.localeCompare(b.date.iso) ||
    a.name.localeCompare(b.name));
}

function lateMinutes(clockIn: string, _e: DemoEmployee): number {
  return Number(clockIn.slice(11, 13)) * 60 + Number(clockIn.slice(14, 16))
    - 480;
}

export const CORRECTION_STATUS = ["Present", "On leave", "Absent, unpaid"];

/* ---------------------------------------------------------------- *
 * T12 Phone clock-in, T16 Kiosk check-in
 * ---------------------------------------------------------------- */

export interface ClockSite { id: string; name: string; radius: number;
  staff: number; display: string }

export const GEOFENCE_NOTE = "Sample sites and radii. The demo never reads " +
  "your location: you choose where you are.";

/** The three places staff may clock in from (radius in metres). */
export function clockSites(c: DemoCompany): ClockSite[] {
  const names: Record<string, string> = { "hq-abu-dhabi": "Head office",
    "br-khalidiya": "Khalidiya branch", "br-al-ain": "Al Ain branch" };
  return Object.entries(names).map(([id, name]) => {
    const staff = live(c).filter((e) => e.location === id).length;
    return { id, name, radius: 150, staff,
      display: `${name}, within 150 metres` };
  });
}

export interface PhoneEntry { employeeId: string; name: string;
  site: string; when: string; inside: boolean }

/** Today's phone punches from the attendance feed (as the Time data). */
export function phonePunches(c: DemoCompany): PhoneEntry[] {
  return c.attendance.filter((d) => d.date === AS_OF &&
    d.status === "present").flatMap((d) => {
    const e = byId(c, d.employeeId);
    if (e.jobKey !== "relationship-manager") return [];
    return [{ employeeId: e.id, name: e.fullName, site: "Head office",
      when: `${displayDate(d.date)}, ${hm(d.clockIn)}`, inside: true }];
  });
}

/* ---------------------------------------------------------------- *
 * T15 Work from home
 * ---------------------------------------------------------------- */

/** Sample limits: Fridays a month, by team. */
const WFH_LIMITS: Record<string, number> = { "dept-corp": 4, "dept-ops": 4,
  "dept-credit": 4, "dept-it": 4, "dept-hr": 2, "dept-fin": 2,
  "dept-compliance": 2 };
export const WFH_NOTE = "Sample rule: head office teams may work from " +
  "home on 2 or 4 Fridays a month, by team. The demo counts the Fridays " +
  "a head office person was working as work-from-home days.";

export interface WfhRow { employeeId: string; name: string; title: string;
  days: number; allowed: number; over: boolean; display: string }

/** October Fridays worked by head office staff, against the sample limit. */
export function wfhRows(c: DemoCompany): WfhRow[] {
  return live(c).filter((e) => e.location === "hq-abu-dhabi" &&
    WFH_LIMITS[e.departmentId] !== undefined).map((e) => {
    const days = c.attendance.filter((d) => d.employeeId === e.id &&
      d.status === "present" && weekday(d.date) === 5).length;
    return { employeeId: e.id, name: e.fullName,
      title: jobTitleText(e.jobKey), days,
      allowed: WFH_LIMITS[e.departmentId] ?? 0,
      over: days > (WFH_LIMITS[e.departmentId] ?? 0),
      display: plural(days, "day", "days") };
  });
}

/* ---------------------------------------------------------------- *
 * T23 Leave-safe roster and overtime cost
 * ---------------------------------------------------------------- */

export const COVER_NOTE = "Sample rule: a team keeps all but one person " +
  "on shift. Cover is priced as 8 hours of overtime for each missing " +
  "seat, at the overtime rate, as an estimate.";

export interface CoverLeave { employeeId: string; name: string;
  from: string; to: string; waiting: boolean }

/** Leave already in the system (booked or waiting), for the calendar. */
export function coverLeave(c: DemoCompany): CoverLeave[] {
  return c.leaveRequests.filter((r) => r.status !== "rejected" &&
    r.endDate >= "2026-11-01" && r.startDate <= "2026-11-30")
    .map((r) => ({ employeeId: r.employeeId,
      name: byId(c, r.employeeId).fullName, from: r.startDate,
      to: r.endDate, waiting: r.status === "pending" }));
}

function slip(e: DemoEmployee, input: ReturnType<typeof payslipInput>)
  : Fils {
  const r = e.workerClass === "uae-national"
    ? payslipWithoutPension(input)
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS);
  return r.value.gross;
}

/** What 8 hours of overtime adds to a November payslip (engine). */
function seatCost(e: DemoEmployee): Fils {
  const x: OvertimeEntry = { date: "2026-11-10", minutes: 480,
    nightMinutes: 0 };
  const base = payslipInput(e, { year: 2026, month: 11 });
  return fils(slip(e, { ...base, overtime: [x] }) - slip(e, base));
}

export interface CoverDay { date: { iso: string; display: string };
  team: string; onShift: number; minimum: number; missing: number;
  cost: Fils; who: string }

export interface CoverCheck { days: CoverDay[]; total: Fils;
  summary: string }

/**
 * Days a team falls below its minimum with the leave already in the
 * system plus one more leave (optional): the check HR runs before
 * saying yes. Working days only, from the first of the month.
 */
export function leaveSafeCheck(c: DemoCompany, extra?: {
  employeeId: string; from: string; to: string }): CoverCheck {
  const away = coverLeave(c).map((l) => ({ id: l.employeeId, from: l.from,
    to: l.to }));
  if (extra !== undefined) {
    away.push({ id: extra.employeeId, from: extra.from, to: extra.to });
  }
  const staff = live(c);
  const teams = [...new Set(staff.map((e) => e.departmentId))];
  const days: CoverDay[] = [];
  for (let n = 1; n <= 30; n++) {
    const iso = `2026-11-${String(n).padStart(2, "0")}`;
    if (!isWorkingDay(iso)) continue;
    for (const t of teams) {
      const mates = staff.filter((e) => e.departmentId === t);
      const gone = mates.filter((e) => away.some((a) => a.id === e.id &&
        a.from <= iso && iso <= a.to));
      const minimum = Math.max(1, mates.length - 1);
      const onShift = mates.length - gone.length;
      if (onShift >= minimum) continue;
      const missing = minimum - onShift;
      const rest = mates.filter((e) => !gone.includes(e));
      const per = rest.length === 0 ? fils(0n) : fils(rest.reduce(
        (s, e) => s + seatCost(e), 0n) / BigInt(rest.length));
      days.push({ date: dateOf(iso), team: departmentText(t), onShift,
        minimum, missing, cost: fils(per * BigInt(missing)),
        who: gone.map((e) => e.fullName).join(", ") });
    }
  }
  const total = fils(days.reduce((s, d) => s + d.cost, 0n));
  return { days, total, summary: days.length === 0
    ? "Every team keeps its minimum on shift."
    : `${plural(days.length, "day", "days")} with a team below its ` +
      "minimum." };
}

/* ---------------------------------------------------------------- *
 * T03 Record leave for someone
 * ---------------------------------------------------------------- */

/** Working days between two dates, as halves (for the leave request). */
export function leaveHalves(from: string, to: string): number {
  return workingDaysBetween(from, to).length * 2;
}

export const RECORD_NOTE = "HR records leave for someone who asked in " +
  "person or by message. It goes to their manager like any request.";
