import {
  computeEmiratisation,
  fils,
  type EmiratisationResult,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import type { DemoEmployee, DemoPayRun, GpssaSummary } from "./types";

/**
 * Emiratisation report from the engine as of the demo date. The flags
 * the engine needs (skilled, permit, WPS, GPSSA) are demo inputs; the
 * pack's targets are unsourced, so the report lists them as missing
 * and never invents a target or a fine.
 */
export function buildEmiratisation(employees: DemoEmployee[],
  run: DemoPayRun): EmiratisationResult {
  const gross = new Map(run.payslips.map((s) => [s.employeeId,
    s.payslip.gross]));
  return computeEmiratisation({ asOf: AS_OF, sectorInScope: true,
    employees: employees.map((e) => ({ employeeId: e.id,
      isUaeNational: e.workerClass === "uae-national",
      joiningDate: e.joiningDate, lastWorkingDate: e.leavingDate,
      skilled: e.grade >= 2, workPermitValid: true,
      paidViaWps: e.iban !== null,
      gpssaRegistered: e.workerClass === "uae-national",
      monthlyWage: gross.get(e.id) ?? null })) });
}

/** GPSSA shares as the engine put them on the payslips. */
export function buildGpssa(employees: DemoEmployee[], run: DemoPayRun)
  : GpssaSummary {
  const byEmployee = run.payslips.filter((s) =>
    s.payslip.workerClass === "uae-national").map((s) => ({
    employeeId: s.employeeId,
    employeeShare: fils(s.payslip.deductions.filter((d) =>
      d.kind === "gpssa").reduce((n, d) => n + d.amount, 0n)),
    employerShare: s.payslip.employerCost }));
  return { nationals: employees.filter((e) =>
    e.workerClass === "uae-national").length,
  employeeShare: fils(byEmployee.reduce((n, x) => n + x.employeeShare,
    0n)),
  employerShare: fils(byEmployee.reduce((n, x) => n + x.employerShare,
    0n)), byEmployee };
}
