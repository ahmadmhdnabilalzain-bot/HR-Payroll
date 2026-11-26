import { accruedHalves, balanceHalves } from "@payroll/engine";
import { AS_OF, workingDaysBetween } from "./calendar";
import { PROBATION_SICK_DATE, UNPAID_DATES } from "./pay-inputs";
import type {
  CaseTag,
  DemoEmployee,
  DemoLeaveBalance,
  DemoLeaveRequest,
  DemoLeaveType,
  LeaveStatus,
} from "./types";

export const LEAVE_TYPES: readonly DemoLeaveType[] = [
  { id: "lt-annual", labelKey: "leave.annual", paid: true,
    annualDays: 30 },
  { id: "lt-sick", labelKey: "leave.sick", paid: true, annualDays: null },
  { id: "lt-unpaid", labelKey: "leave.unpaid", paid: false,
    annualDays: null },
];

/** Company policy for the demo: 30 days a year, credited monthly. */
export const ANNUAL_POLICY = { accrual: "monthly" as const,
  annualDays: 30, joiningYearProRata: true };

type Who = { tag: CaseTag } | { id: string };
type Plan = [Who, string, string, string, LeaveStatus, string];

const PLANS: readonly Plan[] = [
  [{ tag: "unpaid-leave" }, "lt-unpaid", UNPAID_DATES[0]!,
    UNPAID_DATES.at(-1)!, "approved", "reason.personal"],
  [{ tag: "probation" }, "lt-sick", PROBATION_SICK_DATE,
    PROBATION_SICK_DATE, "approved", "reason.medical"],
  [{ tag: "leaver" }, "lt-annual", "2026-04-06", "2026-04-10",
    "approved", "reason.travel"],
  [{ id: "emp-018" }, "lt-annual", "2026-11-16", "2026-11-20",
    "pending", "reason.family"],
  [{ id: "emp-006" }, "lt-annual", "2026-12-21", "2026-12-31",
    "pending", "reason.travel"],
  [{ id: "emp-031" }, "lt-annual", "2026-11-02", "2026-11-04",
    "rejected", "reason.rest"],
];

const halves = (from: string, to: string) =>
  workingDaysBetween(from, to).length * 2;

function whoOf(es: DemoEmployee[], w: Who): string {
  const e = "tag" in w ? es.find((x) => x.cases.includes(w.tag))
    : es.find((x) => x.id === w.id);
  if (e === undefined) throw new Error("leave plan names no employee");
  return e.id;
}

export function buildLeaveRequests(employees: DemoEmployee[])
  : DemoLeaveRequest[] {
  return PLANS.map(([who, leaveTypeId, startDate, endDate, status,
    reasonKey], i) => ({ id: `lr-${String(i + 1).padStart(3, "0")}`,
    employeeId: whoOf(employees, who), leaveTypeId, startDate, endDate,
    halves: halves(startDate, endDate), status, reasonKey }));
}

function balanceOf(e: DemoEmployee, reqs: DemoLeaveRequest[])
  : DemoLeaveBalance {
  const asOf = e.leavingDate !== null && e.leavingDate < AS_OF
    ? e.leavingDate : AS_OF;
  const mine = reqs.filter((r) => r.employeeId === e.id &&
    r.leaveTypeId === "lt-annual" && r.startDate.startsWith("2026"));
  const accrued = accruedHalves(ANNUAL_POLICY, e.joiningDate, 2026, asOf);
  const taken = mine.filter((r) => r.status === "approved")
    .map((r) => ({ date: r.startDate, halves: r.halves }));
  const pendingHalves = mine.filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.halves, 0);
  const b = balanceHalves({ accruedHalves: accrued, carriedHalves: 0,
    carriedExpiresOn: null, adjustmentHalves: 0, taken, pendingHalves,
    asOf });
  return { employeeId: e.id, leaveTypeId: "lt-annual", year: 2026,
    accruedHalves: accrued, takenHalves: b.takenHalves, pendingHalves,
    availableHalves: b.availableHalves };
}

/** Annual leave balances from the engine, for everyone already joined. */
export function buildLeaveBalances(employees: DemoEmployee[],
  reqs: DemoLeaveRequest[]): DemoLeaveBalance[] {
  return employees.filter((e) => e.joiningDate <= AS_OF)
    .map((e) => balanceOf(e, reqs));
}

/** Whole unused days for a settlement (half days are not paid out). */
export function unusedLeaveDays(balances: DemoLeaveBalance[],
  employeeId: string): number {
  const b = balances.find((x) => x.employeeId === employeeId);
  return b === undefined ? 0 : Math.max(0, Math.floor(b.availableHalves
    / 2));
}
