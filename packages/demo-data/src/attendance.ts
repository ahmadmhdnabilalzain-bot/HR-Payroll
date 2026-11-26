import { DEMO_PERIOD, monthDates, isWorkingDay, monthKey } from "./calendar";
import { OVERTIME, UNPAID_DATES } from "./pay-inputs";
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
  const ot = e.cases.includes("overtime")
    ? OVERTIME.find((o) => o.date === date)?.minutes ?? 0 : 0;
  const start = 8 * 60 + rng.int(0, 20);
  const end = start + 9 * 60 + ot;
  return { employeeId: e.id, date, status,
    clockIn: stamp(date, start), clockOut: stamp(date, end),
    workedMinutes: end - start - LUNCH_MINUTES, overtimeMinutes: ot };
}

const inWindow = (e: DemoEmployee, d: string) => e.joiningDate <= d &&
  (e.leavingDate === null || d <= e.leavingDate);

/** Working days of the demo month for everyone on the payroll. */
export function buildAttendance(employees: DemoEmployee[], rng: Rng,
  reqs: DemoLeaveRequest[]): AttendanceDay[] {
  const { year, month } = DEMO_PERIOD;
  const dates = monthDates(year, month).filter(isWorkingDay);
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
