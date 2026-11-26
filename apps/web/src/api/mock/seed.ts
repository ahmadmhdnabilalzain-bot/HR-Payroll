import { addDays } from "@payroll/engine";
import type { Company, LeaveType } from "../contract";
import { periodOf, periodStart, shiftPeriod } from "./dates";
import type { SeedName } from "./options";
import { seedAttendance, seedLeave } from "./seed-activity";
import { seedHistory } from "./seed-history";
import { largeEmployees } from "./seed-large";
import { empId, employeeFrom } from "./seed-employee";
import { DEPARTMENTS, PEOPLE } from "./seed-people";
import {
  KIND,
  uid,
  type MockEmployee,
  type MockSeed,
  type MockUser,
} from "./seed-types";

// NEEDS NATIVE REVIEW: the Arabic company and leave-type names below
// were written by Claude and are not confirmed by a native speaker.

/** Obviously fake: "(demo)" name, registry-example IBAN, demo.test. */
export const COMPANY: Company = {
  id: uid(KIND.company, 1),
  name: "Sample Trading LLC (demo)",
  nameAr: "شركة نموذج التجارية ذ.م.م (تجريبي)",
  wps: { employerId: "0000000123456", bankRoutingCode: "203320101" },
};

const user = (
  n: number, email: string, displayName: string,
  role: MockUser["role"], employeeId: string | null, mfa = false,
): MockUser => ({ id: uid(KIND.user, n), email, displayName,
  mfaEnrolled: mfa, role, employeeId });

export const USERS: MockUser[] = [
  user(1, "owner@demo.test", "Demo Owner", "owner", null, true),
  user(2, "owner2@demo.test", "Second Owner", "owner", null, true),
  user(3, "hr@demo.test", "Demo HR", "hr", null),
  user(4, "manager@demo.test", "Omar Haddad", "manager", empId(2)),
  user(5, "employee@demo.test", "Hassan Ibrahim", "employee", empId(8)),
];

export const LEAVE_TYPES: LeaveType[] = [
  { id: uid(KIND.leaveType, 1), name: "Annual leave",
    nameAr: "إجازة سنوية", paid: true, annualDays: 30 },
  { id: uid(KIND.leaveType, 2), name: "Sick leave", nameAr: "إجازة مرضية",
    paid: true, annualDays: null },
  { id: uid(KIND.leaveType, 3), name: "Unpaid leave",
    nameAr: "إجازة بدون راتب", paid: false, annualDays: null },
];

/** Ten long-standing staff, a joiner on the 10th, one starting next. */
function demoEmployees(today: string): MockEmployee[] {
  const month = periodStart(periodOf(today));
  const next = periodStart(shiftPeriod(periodOf(today), 1));
  return PEOPLE.map((s, i) => {
    const n = i + 1;
    if (n === 11) return employeeFrom(s, n, addDays(month, 9), true);
    if (n === 12) return employeeFrom(s, n, next, false);
    const year = 2016 + (i % 8);
    return employeeFrom(s, n, `${year}-0${(i % 9) + 1}-01`, true);
  });
}

function employeesFor(name: SeedName, today: string): MockEmployee[] {
  if (name === "empty") return [];
  const demo = demoEmployees(today);
  return name === "large" ? [...demo, ...largeEmployees(250 - 12)] : demo;
}

/** Deterministic from `today`; every value passes the contract. */
export function buildSeed(name: SeedName, today: string): MockSeed {
  const employees = employeesFor(name, today);
  const leave = seedLeave(today, employees);
  const base: MockSeed = {
    company: COMPANY, departments: name === "empty" ? [] : DEPARTMENTS,
    employees, leaveTypes: LEAVE_TYPES, users: USERS,
    leave, attendance: seedAttendance(today, employees, leave),
    runs: [], payslips: [], sifs: [], audit: [],
  };
  return seedHistory(base, today, name !== "empty");
}
