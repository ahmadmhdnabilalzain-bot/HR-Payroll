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
 * The run's SIF through packages/wps: payslipToSifEmployee per
 * included payslip, generateSif for the file, validateSif and
 * renderReport for the findings (never a claim of acceptance). A
 * payslip without an IBAN is held out, with its reason.
 */
export function buildSif(company: Company, employees: DemoEmployee[],
  run: DemoPayRun): DemoSif {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const rows = run.payslips.filter((s) => s.sif.included).map((s) => {
    const e = byId.get(s.employeeId)!;
    return payslipToSifEmployee(s.payslip, { personId: e.labourPersonId,
      routingCode: e.routingCode, account: e.iban!.value });
  });
  const sif = generateSif({ employerId: company.employerId,
    bankRoutingCode: company.bankRoutingCode,
    createdDate: SIF_CREATED.date, createdTime: SIF_CREATED.time,
    month: { ...DEMO_PERIOD }, reference: "DEMO", employees: rows });
  const findings = validateSif(sif.text, defaultLayout, SIF_CREATED.date);
  return { fileName: sif.fileName, text: sif.text, total: sif.total,
    recordCount: sif.lines.length, employees: rows.length, findings,
    report: renderReport(findings, sif.fileName) };
}
