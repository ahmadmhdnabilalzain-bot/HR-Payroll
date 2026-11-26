import { accruedHalves, balanceHalves } from "@payroll/engine";
import { AS_OF, workingDaysBetween } from "./calendar";
import { UNPAID_DATES } from "./pay-inputs";
import type { Rng } from "./rng";
import type {
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

type Plan = [string, string, string, LeaveStatus, string];

/** Requests for people with no special case, picked by the seed. */
const PLANS: readonly Plan[] = [
  ["lt-annual", "2026-10-19", "2026-10-23", "approved", "reason.family"],
  ["lt-annual", "2026-10-26", "2026-10-27", "approved", "reason.rest"],
  ["lt-annual", "2026-07-06", "2026-07-17", "approved", "reason.travel"],
  ["lt-annual", "2026-11-16", "2026-11-20", "pending", "reason.travel"],
  ["lt-annual", "2026-12-21", "2026-12-31", "pending", "reason.family"],
  ["lt-sick", "2026-11-03", "2026-11-03", "pending", "reason.medical"],
  ["lt-annual", "2026-11-02", "2026-11-06", "rejected", "reason.rest"],
];

const halves = (from: string, to: string) =>
  workingDaysBetween(from, to).length * 2;

function request(n: number, employeeId: string, p: Plan)
  : DemoLeaveRequest {
  const [leaveTypeId, startDate, endDate, status, reasonKey] = p;
  return { id: `lr-${String(n).padStart(3, "0")}`, employeeId,
    leaveTypeId, startDate, endDate, halves: halves(startDate, endDate),
    status, reasonKey };
}

export function buildLeaveRequests(employees: DemoEmployee[], rng: Rng)
  : DemoLeaveRequest[] {
  const unpaid = employees.find((e) => e.cases.includes("unpaid-leave"))!;
  const leaver = employees.find((e) => e.cases.includes("leaver"))!;
  const plain = rng.shuffle(employees.filter((e) => e.cases.length === 0
    && e.joiningDate < "2026-01-01"));
  const out = [
    request(1, unpaid.id, ["lt-unpaid", UNPAID_DATES[0]!,
      UNPAID_DATES.at(-1)!, "approved", "reason.personal"]),
    request(2, leaver.id, ["lt-annual", "2026-04-06", "2026-04-10",
      "approved", "reason.travel"]),
  ];
  PLANS.forEach((p, i) => out.push(request(i + 3, plain[i]!.id, p)));
  return out;
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
