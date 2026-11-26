import { REIMBURSEMENT_WPS_NOTE, type TraceLine } from "@payroll/contract";
import { fils } from "@payroll/engine";
import type {
  ComputedPayslip,
  ComputedReimbursement,
  SnapshotReimbursement,
} from "../payroll/compute";

/** Trace lines this step owns (replaced when applied again). */
const OWN_TRACE = (id: string) =>
  id.startsWith("reimb.") || id === "pay.net-with-reimbursements";

function lineTrace(r: ComputedReimbursement): TraceLine {
  return { id: r.traceId, label: r.label, formula: "approved expense claim",
    inputs: { claimId: r.claimId }, result: String(r.amount), rules: [] };
}

/**
 * Pure: adds an employee's approved expense claims to a computed
 * payslip after the salary net is known. Lines, gross, settlement and
 * the salary trace are untouched, so a reimbursement never enters a
 * deduction cap, GPSSA or gratuity base, or the SIF (which reads
 * lines). Applying it again gives the same payslip.
 */
export function applyReimbursements(slip: ComputedPayslip,
  items: SnapshotReimbursement[]): ComputedPayslip {
  const salaryNet = slip.salaryNet;
  const mine = items.filter((r) => r.employeeId === slip.employeeId)
    .sort((a, b) => (a.claimId < b.claimId ? -1 : a.claimId > b.claimId
      ? 1 : 0));
  const lines: ComputedReimbursement[] = mine.map((r) => ({
    claimId: r.claimId, label: r.title, amount: r.amount,
    traceId: `reimb.claim#${r.claimId}` }));
  const total = fils(lines.reduce((n, r) => n + r.amount, 0n));
  const net = fils(salaryNet + total);
  const trace = slip.trace.filter((t) => !OWN_TRACE(t.id));
  if (lines.length > 0) {
    trace.push(...lines.map(lineTrace),
      { id: "reimb.total", label: "Reimbursements",
        formula: "sum of approved expense claims",
        inputs: { count: String(lines.length) }, result: String(total),
        rules: [] },
      { id: "pay.net-with-reimbursements", label: "Net pay",
        formula: "salary net + reimbursements",
        inputs: { salaryNet: String(salaryNet),
          reimbursementTotal: String(total) }, result: String(net),
        rules: [] });
  }
  return { ...slip, reimbursements: lines, reimbursementTotal: total,
    salaryNet, net, trace,
    reimbursementNote: lines.length > 0 ? REIMBURSEMENT_WPS_NOTE : null };
}
