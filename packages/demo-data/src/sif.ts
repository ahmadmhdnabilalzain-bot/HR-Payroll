import {
  defaultLayout,
  generateSif,
  payslipToSifEmployee,
  renderReport,
  validateSif,
} from "@payroll/wps";
import { DEMO_PERIOD, SIF_CREATED } from "./calendar";
import type { DemoCompany, DemoEmployee, DemoPayRun, DemoSif } from "./types";

type Company = DemoCompany["company"];

/**
 * The run's SIF through packages/wps: payslipToSifEmployee per payslip,
 * generateSif for the file, validateSif and renderReport for the
 * findings. Every payslip needs bank details; the missing-IBAN case
 * joins after this month, so it is an issue, not a payslip here.
 */
export function buildSif(company: Company, employees: DemoEmployee[],
  run: DemoPayRun): DemoSif {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const rows = run.payslips.map((s) => {
    const e = byId.get(s.employeeId)!;
    if (e.iban === null) {
      throw new Error(`payslip for ${e.id} has no IBAN for the SIF`);
    }
    return payslipToSifEmployee(s.payslip, { personId: e.labourPersonId,
      routingCode: e.routingCode, account: e.iban.value });
  });
  const sif = generateSif({ employerId: company.employerId,
    bankRoutingCode: company.bankRoutingCode,
    createdDate: SIF_CREATED.date, createdTime: SIF_CREATED.time,
    month: { ...DEMO_PERIOD }, reference: "DEMO",
    employees: rows });
  const findings = validateSif(sif.text, defaultLayout, SIF_CREATED.date);
  return { fileName: sif.fileName, text: sif.text, total: sif.total,
    recordCount: sif.lines.length, findings,
    report: renderReport(findings, sif.fileName) };
}
