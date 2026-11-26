import { daysBetween } from "@payroll/engine";
import type {
  LeaveRequest,
  LeaveType,
  Period,
  WirePayRunCreate,
} from "../contract";
import { periodEnd, periodStart } from "./dates";
import { inPeriod } from "./pay";
import type { MockEmployee } from "./seed-types";
import { canonical, sha256 } from "./sha256";

export interface SnapshotInput {
  period: Period;
  entries: WirePayRunCreate["entries"];
  employees: readonly MockEmployee[];
  leave: readonly LeaveRequest[];
  leaveTypes: readonly LeaveType[];
}

/** Approved unpaid leave days inside the period, ends inclusive. */
export function unpaidDaysIn(
  e: MockEmployee, x: Omit<SnapshotInput, "entries" | "employees">,
): number {
  const unpaid = new Set(x.leaveTypes.filter((t) => !t.paid)
    .map((t) => t.id));
  const from = periodStart(x.period);
  const to = periodEnd(x.period);
  return x.leave.filter((l) => l.employeeId === e.id &&
    l.status === "approved" && unpaid.has(l.leaveTypeId) &&
    l.startDate <= to && l.endDate >= from)
    .reduce((n, l) => n + daysBetween(l.startDate > from ? l.startDate
      : from, l.endDate < to ? l.endDate : to) + 1, 0);
}

/**
 * As the api's `snapshotHash`: the run's inputs (entries, and the
 * salaries and unpaid leave of everyone in scope). Approval recomputes
 * it, so a draft whose inputs changed since is never approved.
 */
export function snapshotHash(x: SnapshotInput): string {
  const employees = x.employees.filter((e) => inPeriod(e, x.period))
    .map((e) => ({ id: e.id, joiningDate: e.joiningDate,
      lastWorkingDate: e.lastWorkingDate, workerClass: e.workerClass,
      salary: (e.salary ?? []).map((c) => ({ code: c.code,
        amount: c.amount, sifBucket: c.sifBucket })),
      unpaidLeaveDays: unpaidDaysIn(e, x) }));
  return sha256(canonical({ period: x.period, entries: x.entries,
    employees }));
}
