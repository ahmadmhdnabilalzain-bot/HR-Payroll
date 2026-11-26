import { fils, type Fils } from "@payroll/engine";
import type { DemoCompany } from "./types";

export interface HeadlineTotals {
  employees: number;
  onPayroll: number;
  payslips: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  employerCost: Fils;
  /** Gross pay plus employer costs (GPSSA employer share). */
  totalCost: Fils;
  sifTotal: Fils;
  /** Leaver's gratuity and leave pay: outside the run and the SIF. */
  settlements: Fils;
  nationals: number;
  pendingApprovals: number;
}

/** The numbers the dashboard leads with; every one is a sum. */
export function headlineTotals(c: DemoCompany): HeadlineTotals {
  const t = c.payRun.totals;
  return { employees: c.employees.length,
    onPayroll: t.payslips, payslips: t.payslips, gross: t.gross,
    deductions: t.deductions, net: t.net, employerCost: t.employerCost,
    totalCost: fils(t.gross + t.employerCost), sifTotal: c.sif.total,
    settlements: fils(c.payRun.settlements.reduce((s, x) =>
      s + x.result.total, 0n)),
    nationals: c.gpssa.nationals, pendingApprovals: c.approvals.length };
}

export interface DepartmentCost {
  departmentId: string;
  labelKey: string;
  headcount: number;
  gross: Fils;
  net: Fils;
  employerCost: Fils;
  totalCost: Fils;
}

/** Cost per department from the run's payslips. */
export function costByDepartment(c: DemoCompany): DepartmentCost[] {
  const deptOf = new Map(c.employees.map((e) => [e.id, e.departmentId]));
  return c.departments.map((d) => {
    const slips = c.payRun.payslips.filter((s) =>
      deptOf.get(s.employeeId) === d.id);
    const add = (f: (s: (typeof slips)[number]) => bigint) =>
      fils(slips.reduce((n, s) => n + f(s), 0n));
    const gross = add((s) => s.payslip.gross);
    const employerCost = add((s) => s.payslip.employerCost);
    return { departmentId: d.id, labelKey: d.labelKey,
      headcount: slips.length, gross, net: add((s) => s.payslip.net),
      employerCost, totalCost: fils(gross + employerCost) };
  });
}

export function employeeById(c: DemoCompany, id: string) {
  const e = c.employees.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no employee ${id}`);
  return e;
}

export function payslipOf(c: DemoCompany, employeeId: string) {
  return c.payRun.payslips.find((s) => s.employeeId === employeeId)
    ?? null;
}

export function employeesWithCase(c: DemoCompany, tag: string) {
  return c.employees.filter((e) => e.cases.some((x) => x === tag));
}
