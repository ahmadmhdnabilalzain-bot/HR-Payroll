import {
  DEMO_PERIOD,
  fakeIban,
  SIF_CREATED,
  type DemoCompany,
} from "@payroll/demo-data";
import { fils } from "@payroll/engine";
import {
  defaultLayout,
  generateSif,
  ibanChecksumOk,
  payslipToSifEmployee,
  validateSif,
} from "@payroll/wps";
import type { SifCheck } from "./types";

/**
 * The salary file check, re-run in the browser with the IBANs a person
 * has entered: the same packages/wps steps the demo package uses
 * (payslipToSifEmployee, generateSif, validateSif). A payslip with no
 * usable IBAN is held out; the routing-code finding (the demo bank's
 * code is invented) is reported apart, never as a person's problem.
 */
export function runSifCheck(c: DemoCompany,
  entered: Readonly<Record<string, string>>): SifCheck {
  const byId = new Map(c.employees.map((e) => [e.id, e]));
  const account = (id: string): string | null =>
    entered[id] ?? byId.get(id)?.iban?.value ?? null;
  const held = c.payRun.payslips.filter((s) => account(s.employeeId)
    === null);
  const rows = c.payRun.payslips.filter((s) =>
    account(s.employeeId) !== null).map((s) => {
    const e = byId.get(s.employeeId);
    if (e === undefined) throw new Error(`DEMO_NO_EMPLOYEE ${s.employeeId}`);
    return { id: e.id, row: payslipToSifEmployee(s.payslip, {
      personId: e.labourPersonId, routingCode: e.routingCode,
      account: account(e.id) ?? "" }) };
  });
  const sif = generateSif({ employerId: c.company.employerId,
    bankRoutingCode: c.company.bankRoutingCode,
    createdDate: SIF_CREATED.date, createdTime: SIF_CREATED.time,
    month: { ...DEMO_PERIOD }, reference: "DEMO",
    employees: rows.map((r) => r.row) });
  const findings = validateSif(sif.text, defaultLayout, SIF_CREATED.date);
  const byAccount = new Map(rows.map((r) => [account(r.id), r.id]));
  const badAccountIds = [...new Set(findings.filter((f) =>
    f.code === "IBAN_CHECKSUM").flatMap((f) => {
    const id = byAccount.get(f.value);
    return id === undefined ? [] : [id];
  }))];
  return { totalFils: sif.total, recordCount: rows.length,
    heldIds: held.map((s) => s.employeeId),
    heldFils: fils(held.reduce((n, s) => n + s.payslip.net, 0n)),
    badAccountIds,
    routingInvented: findings.some((f) => f.code === "ROUTING_UNKNOWN"),
    otherFindings: findings.filter((f) => f.code !== "IBAN_CHECKSUM" &&
      f.code !== "ROUTING_UNKNOWN").length };
}

/** The IBAN printed on the employee's (fictional) bank letter. */
export function bankLetterIban(employeeId: string): string {
  const n = Number(employeeId.replace(/\D/g, ""));
  return fakeIban(n).value;
}

export const ibanOk = (v: string): boolean => ibanChecksumOk(v);
