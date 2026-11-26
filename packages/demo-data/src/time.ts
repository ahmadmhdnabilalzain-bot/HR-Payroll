/**
 * WP5 Time: shifts, the November roster, attendance against shifts,
 * punches, overtime claims and a crew pre-approval. Day sheets and
 * roster checks come from the engine's time rules; overtime values
 * from the payroll engine (the payslip with and without the claim).
 */
import {
  addDays,
  calculatePayslip,
  checkRoster,
  computeDaySheet,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  loadTimeParams,
  selectPack,
  TIME_PACKS,
  type Fils,
  type Interval,
  type OvertimeEntry,
  type PayslipInput,
  type ShiftSlot,
  type TimeFlag,
} from "@payroll/engine";
import { AS_OF, isWorkingDay } from "./calendar";
import { displayDate, duration } from "./display";
import { NIGHT_OVERTIME, OVERTIME, payslipInput } from "./pay-inputs";
import { payslipWithoutPension } from "./pension";
import type { AttendanceDay, DemoCompany, DemoEmployee } from "./types";

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24)
  .padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const minutesOf = (stamp: string) => Number(stamp.slice(11, 13)) * 60 +
  Number(stamp.slice(14, 16));
const nameOf = (c: DemoCompany, id: string) =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

export interface ShiftTemplate { id: string; label: string;
  slot: ShiftSlot; display: { hours: string; break: string } }

const shift = (id: string, label: string, start: number, end: number,
  breakMinutes: number): ShiftTemplate => ({ id, label,
  slot: { start, end, breakMinutes }, display: { hours:
    `${hhmm(start)} to ${hhmm(end)}`, break: duration(breakMinutes) } });

/** Shift templates of the fictional bank (sample hours). */
export function shifts(): ShiftTemplate[] {
  return [shift("sh-hq", "Head office day", 480, 1020, 60),
    shift("sh-branch", "Branch day", 480, 1020, 60),
    shift("sh-it-night", "IT upgrade window", 1320, 1440, 0)];
}

const slotFor = (e: DemoEmployee) => (e.location === "hq-abu-dhabi"
  ? shifts()[0]! : shifts()[1]!);

const timeParams = () => loadTimeParams(selectPack(TIME_PACKS, AS_OF),
  undefined);

export interface RosterCell { date: string; kind: "shift" | "rest" |
  "leave"; shiftId: string | null; pending: boolean; label: string }
export interface RosterPlan {
  days: { iso: string; display: string; status: "published" | "draft" }[];
  rows: { employeeId: string; name: string; cells: RosterCell[] }[];
  /** The engine's roster checks (informational, never blocking). */
  flags: (TimeFlag & { employeeId: string })[];
}

const ROSTER_FROM = "2026-11-09";

function cellOf(c: DemoCompany, e: DemoEmployee, date: string)
  : RosterCell {
  const leave = c.leaveRequests.find((r) => r.employeeId === e.id &&
    r.status !== "rejected" && r.startDate <= date && date <= r.endDate);
  if (!isWorkingDay(date)) {
    return { date, kind: "rest", shiftId: null, pending: false,
      label: "Rest day" };
  }
  if (leave !== undefined) {
    return { date, kind: "leave", shiftId: null,
      pending: leave.status === "pending",
      label: leave.status === "pending" ? "Leave (pending)" : "Leave" };
  }
  const s = slotFor(e);
  return { date, kind: "shift", shiftId: s.id, pending: false,
    label: `${s.label}, ${s.display.hours}` };
}

/** Two weeks from 9 November: the first published, the second draft. */
export function rosterPlan(c: DemoCompany): RosterPlan {
  const dates = Array.from({ length: 14 }, (_, i) =>
    addDays(ROSTER_FROM, i));
  const staff = c.employees.filter((e) => e.joiningDate <= dates[0]! &&
    e.leavingDate === null);
  const rows = staff.map((e) => ({ employeeId: e.id, name: e.fullName,
    cells: dates.map((d) => cellOf(c, e, d)) }));
  const p = timeParams();
  const flags = rows.flatMap((r) => checkRoster({ employeeId: r.employeeId,
    days: r.cells.map((x) => ({ date: x.date, slot: x.kind === "shift"
      ? slotFor(c.employees.find((e) => e.id === r.employeeId)!).slot
      : x.kind === "rest" ? "rest" : null, holiday: false,
    companyRestDay: x.kind === "rest", ramadan: false,
    onApprovedLeave: x.kind === "leave" && !x.pending })) }, p)
    .map((f) => ({ ...f, employeeId: r.employeeId })));
  return { days: dates.map((d, i) => ({ iso: d, display: displayDate(d),
    status: i < 7 ? "published" : "draft" })), rows, flags };
}

/** Clock times as worked intervals, lunch 12:00 to 13:00 left out. */
function workedOf(d: AttendanceDay): Interval[] {
  const a = minutesOf(d.clockIn!);
  const b = minutesOf(d.clockOut!);
  if (b >= 1320) {
    return [{ start: a, end: 720 }, { start: 780, end: a + 540 },
      { start: 1320, end: b }];
  }
  return [{ start: a, end: 720 }, { start: 780, end: b }];
}

/** Sample company grace before a late arrival is listed. */
export const LATE_GRACE_MINUTES = 15;

export interface ShiftCompare { employeeId: string; name: string;
  days: number; overtimeMinutes: number; nightOvertimeMinutes: number;
  late: { date: string; minutes: number; display: string }[];
  display: { overtime: string; late: string } }

/** October attendance against each person's shift (engine sheets). */
export function attendanceAgainstShifts(c: DemoCompany): ShiftCompare[] {
  const p = timeParams();
  return c.timesheets.map((t) => {
    const e = c.employees.find((x) => x.id === t.employeeId)!;
    const sheets = c.attendance.filter((d) => d.employeeId === e.id &&
      d.status === "present").map((d) => computeDaySheet({ date: d.date,
      kind: "work", shift: slotFor(e).slot, worked: workedOf(d),
      openRecord: false, ramadan: false, leave: "none" }, p));
    const ot = sheets.reduce((n, s) => n + s.overtimeMinutes, 0);
    const late = sheets.filter((s) => s.lateMinutes > LATE_GRACE_MINUTES)
      .map((s) => ({ date: s.date, minutes: s.lateMinutes,
        display: `${displayDate(s.date)}, ${duration(s.lateMinutes)} ` +
          "late" }));
    return { employeeId: e.id, name: e.fullName, days: sheets.length,
      overtimeMinutes: ot, nightOvertimeMinutes: sheets.reduce((n, s) =>
        n + s.overtimeNightMinutes, 0), late,
      display: { overtime: duration(ot), late: late.length === 0 ? "None"
        : `${late.length} ${late.length === 1 ? "day" : "days"}` } };
  });
}

export interface TodayBoard { date: string; active: number;
  present: number; onLeave: number; absent: number; notRecorded: number;
  display: { date: string; summary: string } }

/** Attendance on the demo's today (27 October). */
export function attendanceToday(c: DemoCompany): TodayBoard {
  const days = c.attendance.filter((d) => d.date === AS_OF);
  const active = c.employees.filter((e) => e.joiningDate <= AS_OF &&
    (e.leavingDate === null || e.leavingDate >= AS_OF)).length;
  const n = (s: AttendanceDay["status"]) =>
    days.filter((d) => d.status === s).length;
  const present = n("present");
  return { date: AS_OF, active, present, onLeave: n("leave"),
    absent: n("absent-unpaid"), notRecorded: active - days.length,
    display: { date: displayDate(AS_OF), summary: `${present} of ` +
      `${active} in today` } };
}

export interface Punch { employeeId: string; name: string; date: string;
  in: string | null; out: string | null; source: string }

/** Today's punches, in and out, by reader or phone (demo devices). */
export function punches(c: DemoCompany): Punch[] {
  return c.attendance.filter((d) => d.date === AS_OF &&
    d.status === "present").map((d) => {
    const e = c.employees.find((x) => x.id === d.employeeId)!;
    const source = e.jobKey === "relationship-manager"
      ? "Phone, inside the office area" : e.location === "hq-abu-dhabi"
        ? "Head office reader (demo)" : "Branch reader (demo)";
    return { employeeId: e.id, name: e.fullName, date: d.date,
      in: hhmm(minutesOf(d.clockIn!)), out: hhmm(minutesOf(d.clockOut!)),
      source };
  });
}

export interface UnmatchedPunch { id: string; badge: string;
  reader: string; date: string; time: string; reason: string;
  status: "to-match"; display: { when: string } }

/** Device punches no person or pair matches (sample). */
export function unmatchedPunches(_c: DemoCompany): UnmatchedPunch[] {
  const u = (id: string, badge: string, reader: string, date: string,
    time: string, reason: string): UnmatchedPunch => ({ id, badge,
    reader, date, time, reason, status: "to-match",
    display: { when: `${displayDate(date)}, ${time}` } });
  return [u("pu-1", "DEMO-BADGE-0042", "Al Ain branch reader (demo)",
    "2026-10-27", "07:58", "This badge is not assigned to anyone."),
  u("pu-2", "DEMO-BADGE-0020", "Head office reader (demo)", "2026-10-26",
    "17:04", "An out punch with no in punch that day.")];
}

function slipValue(e: DemoEmployee, input: PayslipInput): Fils {
  const r = e.workerClass === "uae-national" ? payslipWithoutPension(input)
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS);
  return r.value.gross;
}

/** What one claim adds to a month's gross pay, per the engine. */
function claimValue(e: DemoEmployee, month: number, base: OvertimeEntry[],
  claim: OvertimeEntry): Fils {
  const input = payslipInput(e, { year: 2026, month });
  const without = { ...input, overtime: base.filter((x) => x !== claim) };
  return fils(slipValue(e, { ...without, overtime: [...without.overtime,
    claim] }) - slipValue(e, without));
}

export interface OvertimeClaim { id: string; employeeId: string;
  date: string; minutes: number; nightMinutes: number;
  status: "approved" | "pending"; value: Fils;
  display: { name: string; date: string; time: string; value: string } }

const PENDING: [string, OvertimeEntry][] = [
  ["emp-018", { date: "2026-10-26", minutes: 90, nightMinutes: 0 }],
  ["emp-018", { date: "2026-10-27", minutes: 60, nightMinutes: 0 }]];

/** October claims (paid in the run) and new ones for November. */
export function overtimeClaims(c: DemoCompany): OvertimeClaim[] {
  const paid = c.employees.flatMap((e) => {
    const list = e.cases.includes("overtime") ? OVERTIME
      : e.cases.includes("night-overtime") ? NIGHT_OVERTIME : [];
    return list.map((x) => ({ e, x, status: "approved" as const,
      base: list }));
  });
  const pending = PENDING.map(([id, x]) => ({ x, base: [x],
    e: c.employees.find((e) => e.id === id)!, status: "pending" as const }));
  return [...paid, ...pending].map(({ e, x, status, base }, i) => {
    const value = claimValue(e, 10, base, x);
    return { id: `ot-${i + 1}`, employeeId: e.id, date: x.date,
      minutes: x.minutes, nightMinutes: x.nightMinutes, status, value,
      display: { name: e.fullName, date: displayDate(x.date),
        time: duration(x.minutes), value: status === "approved"
          ? `${formatAed(value)}, paid in October`
          : `${formatAed(value)} (estimate, for the November run)` } };
  });
}

export interface PreApproval { id: string; requestedBy: string;
  date: string; minutesEach: number; people: string[]; estimate: Fils;
  status: "pending"; reason: string;
  display: { requestedBy: string; date: string; estimate: string } }

/** Operations asks to work late at the November month-end close. */
export function overtimePreApprovals(c: DemoCompany): PreApproval[] {
  const x: OvertimeEntry = { date: "2026-11-03", minutes: 120,
    nightMinutes: 0 };
  const people = ["emp-017", "emp-018", "emp-019"];
  const estimate = fils(people.reduce((n, id) => {
    const e = c.employees.find((y) => y.id === id)!;
    return n + claimValue(e, 11, [x], x);
  }, 0n));
  return [{ id: "pre-1", requestedBy: "emp-016", date: x.date,
    minutesEach: x.minutes, people, estimate, status: "pending",
    reason: "Month-end close: payments released after hours.",
    display: { requestedBy: nameOf(c, "emp-016"),
      date: displayDate(x.date), estimate: `${formatAed(estimate)} ` +
        "(estimate)" } }];
}
