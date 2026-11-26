import {
  AS_OF,
  DEMO_PERIOD,
  isWorkingDay,
  monthDates,
  monthKey,
} from "./calendar";
import { NIGHT_OVERTIME, OVERTIME, UNPAID_DATES } from "./pay-inputs";
import { employedIn } from "./payroll";
import type { Rng } from "./rng";
import type {
  AttendanceDay,
  DayStatus,
  DemoEmployee,
  DemoLeaveRequest,
  TimesheetSummary,
} from "./types";

const LUNCH_MINUTES = 60;

const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:` +
  String(minutes % 60).padStart(2, "0");

/** Dubai local time (UTC+4), as the clock-in screen would show it. */
const stamp = (date: string, minutes: number): string =>
  `${date}T${hhmm(minutes)}:00+04:00`;

/** Planted late arrivals (minutes after 08:00), for the time screens. */
export const LATE_ARRIVALS = [
  { employeeId: "emp-008", date: "2026-10-05", minutes: 38 },
  { employeeId: "emp-008", date: "2026-10-13", minutes: 25 },
  { employeeId: "emp-008", date: "2026-10-21", minutes: 47 },
];

function onLeave(e: DemoEmployee, date: string,
  reqs: DemoLeaveRequest[]): boolean {
  return reqs.some((r) => r.employeeId === e.id &&
    r.status === "approved" && r.leaveTypeId !== "lt-unpaid" &&
    r.startDate <= date && date <= r.endDate);
}

function statusOf(e: DemoEmployee, date: string,
  reqs: DemoLeaveRequest[]): DayStatus {
  if (e.cases.includes("unpaid-leave") && UNPAID_DATES.includes(date)) {
    return "absent-unpaid";
  }
  return onLeave(e, date, reqs) ? "leave" : "present";
}

function dayOf(e: DemoEmployee, date: string, rng: Rng,
  reqs: DemoLeaveRequest[]): AttendanceDay {
  const status = statusOf(e, date, reqs);
  if (status !== "present") {
    return { employeeId: e.id, date, status, clockIn: null,
      clockOut: null, workedMinutes: 0, overtimeMinutes: 0 };
  }
  const list = e.cases.includes("overtime") ? OVERTIME
    : e.cases.includes("night-overtime") ? NIGHT_OVERTIME : [];
  const ot = list.find((o) => o.date === date)?.minutes ?? 0;
  // Most people arrive between 07:50 and 08:10; a few days are late.
  const jitter = rng.int(0, 20);
  const late = LATE_ARRIVALS.find((x) => x.employeeId === e.id &&
    x.date === date);
  const start = late !== undefined ? 8 * 60 + late.minutes
    : 8 * 60 - 10 + jitter;
  // Night work (IT upgrade): back on site from 22:00, out after.
  const night = list === NIGHT_OVERTIME && ot > 0;
  const end = night ? 22 * 60 + ot : start + 9 * 60 + ot;
  const worked = night ? 8 * 60 + ot : end - start - LUNCH_MINUTES;
  return { employeeId: e.id, date, status,
    clockIn: stamp(date, start), clockOut: stamp(date, end),
    workedMinutes: worked, overtimeMinutes: ot };
}

const inWindow = (e: DemoEmployee, d: string) => e.joiningDate <= d &&
  (e.leavingDate === null || d <= e.leavingDate);

/** Working days of the demo month for everyone on the payroll. */
export function buildAttendance(employees: DemoEmployee[], rng: Rng,
  reqs: DemoLeaveRequest[]): AttendanceDay[] {
  const { year, month } = DEMO_PERIOD;
  // Recorded up to "today" in the demo.
  const dates = monthDates(year, month).filter((d) => isWorkingDay(d) &&
    d <= AS_OF);
  return employees.filter((e) => employedIn(e, year, month))
    .flatMap((e) => dates.filter((d) => inWindow(e, d))
      .map((d) => dayOf(e, d, rng, reqs)));
}

export function buildTimesheets(days: AttendanceDay[])
  : TimesheetSummary[] {
  const by = new Map<string, AttendanceDay[]>();
  for (const d of days) by.set(d.employeeId, [...by.get(d.employeeId)
    ?? [], d]);
  const count = (xs: AttendanceDay[], s: DayStatus) =>
    xs.filter((x) => x.status === s).length;
  return [...by.entries()].map(([employeeId, xs]) => ({ employeeId,
    month: monthKey(DEMO_PERIOD.year, DEMO_PERIOD.month),
    workingDays: xs.length, presentDays: count(xs, "present"),
    leaveDays: count(xs, "leave"), unpaidDays: count(xs, "absent-unpaid"),
    workedMinutes: xs.reduce((s, x) => s + x.workedMinutes, 0),
    overtimeMinutes: xs.reduce((s, x) => s + x.overtimeMinutes, 0) }));
}
