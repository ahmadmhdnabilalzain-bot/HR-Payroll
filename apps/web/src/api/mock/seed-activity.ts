import { addDays, daysBetween } from "@payroll/engine";
import type { AttendanceRecord, LeaveRequest } from "../contract";
import {
  clampToYear,
  datesBetween,
  dubaiAt,
  isWorkday,
  periodOf,
  periodStart,
} from "./dates";
import { KIND, uid, type MockEmployee } from "./seed-types";

const HR_USER = uid(KIND.user, 3);
const ANNUAL = uid(KIND.leaveType, 1);
const SICK = uid(KIND.leaveType, 2);

type Spec = [n: number, type: string, from: number, to: number,
  status: LeaveRequest["status"]];

function request(today: string, i: number, s: Spec): LeaveRequest {
  const [n, type, from, to, status] = s;
  const year = Number(today.slice(0, 4));
  const startDate = clampToYear(addDays(today, from), year);
  const endDate = clampToYear(addDays(today, to), year);
  const decided = status === "approved" || status === "rejected";
  return {
    id: uid(KIND.leave, i + 1), employeeId: uid(KIND.employee, n),
    leaveTypeId: type, startDate, endDate,
    days: daysBetween(startDate, endDate) + 1, status,
    reason: status === "rejected" ? "Busy month" : null,
    decidedBy: decided ? HR_USER : null,
    decidedAt: decided ? dubaiAt(addDays(today, -20), 10, 0) : null,
  };
}

/**
 * Days are offsets from today. One person is on leave today; two
 * requests wait for a decision; the rest show each other status.
 */
const LEAVE: Spec[] = [
  [3, ANNUAL, 14, 18, "pending"],
  [6, ANNUAL, 20, 21, "pending"],
  [5, ANNUAL, -1, 2, "approved"],
  [7, ANNUAL, -60, -56, "approved"],
  [4, ANNUAL, -40, -38, "rejected"],
  [9, SICK, -30, -30, "cancelled"],
];

export function seedLeave(
  today: string,
  employees: readonly MockEmployee[],
): LeaveRequest[] {
  const ids = new Set(employees.map((e) => e.id));
  return LEAVE.map((s, i) => request(today, i, s))
    .filter((r) => ids.has(r.employeeId));
}

function record(
  e: MockEmployee, date: string, open: boolean, n: number,
): AttendanceRecord {
  return {
    id: uid(KIND.attendance, n), employeeId: e.id, date,
    clockIn: dubaiAt(date, 9, 0),
    clockOut: open ? null : dubaiAt(date, 17, 30),
    minutes: open ? null : 510, source: "self", note: null,
  };
}

/**
 * Workdays of this month up to today, 09:00 to 17:30 in Dubai, except
 * approved leave. Today's records are still open.
 */
export function seedAttendance(
  today: string,
  employees: readonly MockEmployee[],
  leave: readonly LeaveRequest[],
): AttendanceRecord[] {
  const away = (e: MockEmployee, d: string): boolean => leave.some((l) =>
    l.employeeId === e.id && l.status === "approved" &&
    l.startDate <= d && l.endDate >= d);
  const days = datesBetween(periodStart(periodOf(today)), today)
    .filter(isWorkday);
  const out: AttendanceRecord[] = [];
  for (const date of days) {
    for (const e of employees) {
      if (e.joiningDate > date || away(e, date)) continue;
      out.push(record(e, date, date === today, out.length + 1));
    }
  }
  return out;
}
