import type { EmployeeView, Role, SalaryComponent } from "@payroll/contract";
import { toMoney } from "../db/money";
import type { EmployeeRow } from "./employees";

export interface Viewer {
  role: Role;
  employeeId: string | null;
  /** API key callers: salary, bank and ids need `payroll:read`. */
  apiScopes?: readonly string[];
}

export type Scope =
  | { kind: "all" }
  | { kind: "reports"; managerId: string | null }
  | { kind: "self"; employeeId: string | null };

/** owner/hr: everyone; manager: self and direct reports; else self. */
export function viewerScope(v: Viewer): Scope {
  if (v.role === "owner" || v.role === "hr") return { kind: "all" };
  if (v.role === "manager") {
    return { kind: "reports", managerId: v.employeeId };
  }
  return { kind: "self", employeeId: v.employeeId };
}

export function inScope(s: Scope, r: { id: string; managerId: string |
  null }): boolean {
  if (s.kind === "all") return true;
  if (s.kind === "reports") {
    return s.managerId !== null &&
      (r.id === s.managerId || r.managerId === s.managerId);
  }
  return s.employeeId !== null && r.id === s.employeeId;
}

const payroll = (v: Viewer) => v.role === "owner" || v.role === "hr";
const isSelf = (v: Viewer, r: EmployeeRow) =>
  v.employeeId !== null && v.employeeId === r.id;

function salaryOut(r: EmployeeRow): SalaryComponent[] | null {
  return r.salary === null ? null : r.salary.map((c) => ({
    code: c.code, label: c.label, labelAr: c.labelAr,
    amount: toMoney(c.amount), sifBucket: c.sifBucket }));
}

/**
 * The only function that serialises an employee. Salary and the masked
 * bank: owner, hr and the person. Labour person id and Emirates ID:
 * owner and hr. `null` means "not visible to you or not set". Status
 * is "left" once the last working day is before today (Dubai).
 */
export function toEmployeeView(r: EmployeeRow, v: Viewer,
  today: string): EmployeeView {
  const keyBlind = v.apiScopes !== undefined &&
    !v.apiScopes.includes("payroll:read");
  const money = !keyBlind && (payroll(v) || isSelf(v, r));
  const ids = !keyBlind && payroll(v);
  return {
    id: r.id, number: r.number, fullName: r.fullName,
    fullNameAr: r.fullNameAr, email: r.email,
    departmentId: r.departmentId, managerId: r.managerId,
    jobTitle: r.jobTitle, nationality: r.nationality,
    workerClass: r.workerClass, joiningDate: r.joiningDate,
    lastWorkingDate: r.lastWorkingDate,
    status: r.lastWorkingDate !== null && r.lastWorkingDate < today
      ? "left" : "active",
    salary: money ? salaryOut(r) : null,
    bank: money && r.bank !== null ? { routingCode: r.bank.routingCode,
      ibanLast4: r.bank.ibanLast4 } : null,
    labourPersonId: ids ? r.labourPersonId : null,
    emiratesIdNumber: ids ? r.emiratesIdNumber : null,
    ...(r.unreadable.length > 0 ? { unreadable: [...r.unreadable] } : {}),
  };
}
