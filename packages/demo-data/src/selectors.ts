import { fils, type Fils } from "@payroll/engine";
import { PAY_CALENDAR } from "./calendar";
import { issuesOf, type DemoIssue } from "./issues";
import { PENSION_NOT_COMPUTED } from "./pension";
import type {
  ApprovalItem,
  DemoCompany,
  DemoLeaveRequest,
  DemoPayslip,
} from "./types";

export interface HeadlineTotals {
  employees: number;
  uaeNationals: number;
  payslips: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  /** In the SIF; the rest is held (no IBAN). */
  sifTotal: Fils;
  heldNet: Fils;
  /** Leaver's gratuity and leave pay: outside the run and the SIF. */
  settlements: Fils;
  issues: number;
  needsConfirmation: number;
  pendingApprovals: number;
  rulesScope: string;
  /** Source status for every headline figure, shown on demand. */
  basis: HeadlineBasis;
}

export interface HeadlineBasis {
  ruleSet: "UAE mainland";
  freeZone: "unconfirmed";
  pension: string;
}

export const HEADLINE_BASIS: HeadlineBasis = { ruleSet: "UAE mainland",
  freeZone: "unconfirmed",
  pension: `UAE nationals: not computed (${PENSION_NOT_COMPUTED.en})` };

/** The numbers the dashboard leads with; every one is a sum. */
export function headlineTotals(c: DemoCompany): HeadlineTotals {
  const t = c.payRun.totals;
  const issues = issuesOf(c);
  return { employees: c.employees.length,
    uaeNationals: c.nationalities.uaeNationals, payslips: t.payslips,
    gross: t.gross, deductions: t.deductions, net: t.net,
    sifTotal: c.sif.total, heldNet: t.heldNet,
    settlements: fils(c.payRun.settlements.reduce((s, x) =>
      s + x.result.total, 0n)),
    issues: issues.filter((i) => i.severity !== "needs-confirmation")
      .length,
    needsConfirmation: issues.filter((i) =>
      i.severity === "needs-confirmation").length,
    pendingApprovals: c.approvals.length, rulesScope: c.rulesScope,
    basis: { ...HEADLINE_BASIS } };
}

/** The same, under the name the UI uses. */
export const headline = headlineTotals;

export interface DocumentExpiry { id: string; employeeId: string;
  kind: string; expiresOn: string; daysLeft: number }

/** Upcoming document expiries, soonest first. */
export function documents(c: DemoCompany): DocumentExpiry[] {
  return [...c.documents].sort((a, b) => a.daysLeft - b.daysLeft)
    .map((d) => ({ id: d.id, employeeId: d.employeeId, kind: d.kind,
      expiresOn: d.expiresOn, daysLeft: d.daysLeft }));
}

export interface PayCalendar { asOf: string; cutOff: string;
  approveBy: string; sifDue: string; payday: string;
  label: "sample dates" }

/** The pay-month timeline: SAMPLE dates, labelled as such. */
export function payCalendar(_c?: DemoCompany): PayCalendar {
  return { ...PAY_CALENDAR };
}

export interface DepartmentCost {
  departmentId: string;
  labelKey: string;
  headcount: number;
  gross: Fils;
  net: Fils;
}

/** Cost per department from the run's payslips. */
export function costByDepartment(c: DemoCompany): DepartmentCost[] {
  const deptOf = new Map(c.employees.map((e) => [e.id, e.departmentId]));
  return c.departments.map((d) => {
    const slips = c.payRun.payslips.filter((s) =>
      deptOf.get(s.employeeId) === d.id);
    const add = (f: (s: DemoPayslip) => bigint) =>
      fils(slips.reduce((n, s) => n + f(s), 0n));
    return { departmentId: d.id, labelKey: d.labelKey,
      headcount: slips.length, gross: add((s) => s.payslip.gross),
      net: add((s) => s.payslip.net) };
  });
}

/** Items the UI lists as "needs confirmation" (e.g. pension). */
export function needsConfirmation(c: DemoCompany): DemoIssue[] {
  return issuesOf(c).filter((i) => i.severity === "needs-confirmation");
}

export function employeeById(c: DemoCompany, id: string) {
  const e = c.employees.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no employee ${id}`);
  return e;
}

export function payslipByEmployee(c: DemoCompany, employeeId: string)
  : DemoPayslip | null {
  return c.payRun.payslips.find((s) => s.employeeId === employeeId)
    ?? null;
}

export function leaveRequests(c: DemoCompany,
  status?: DemoLeaveRequest["status"]): DemoLeaveRequest[] {
  return c.leaveRequests.filter((r) => status === undefined ||
    r.status === status);
}

export function approvalsInbox(c: DemoCompany, checkerEmployeeId?:
  string): ApprovalItem[] {
  return c.approvals.filter((a) => checkerEmployeeId === undefined ||
    a.checkerEmployeeId === checkerEmployeeId);
}

export interface SifSummary {
  fileName: string;
  employees: number;
  heldOut: number;
  total: Fils;
  errors: number;
  warnings: number;
  report: string;
  rulesScope: string;
}

export function sifSummary(c: DemoCompany): SifSummary {
  const errors = c.sif.findings.filter((f) => f.severity === "error");
  return { fileName: c.sif.fileName, employees: c.sif.employees,
    heldOut: c.payRun.payslips.filter((s) => !s.sif.included).length,
    total: c.sif.total, errors: errors.length,
    warnings: c.sif.findings.length - errors.length,
    report: c.sif.report, rulesScope: c.rulesScope };
}

export function employeesWithCase(c: DemoCompany, tag: string) {
  return c.employees.filter((e) => e.cases.some((x) => x === tag));
}
