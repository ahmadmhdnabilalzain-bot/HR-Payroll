import { IDS, SALARY_SENTINEL } from "./examples-people";
import { NOT_COMPUTED_PAY } from "./payroll";
import { SIF_STATEMENT } from "./sif";

const period = { year: 2026, month: 3 };
const notComputed = [...NOT_COMPUTED_PAY];

const trace = [{
  id: "pay.basic",
  label: "Basic salary",
  formula: "entered monthly amount",
  inputs: { salaryVersion: "1" },
  result: "777777",
  rules: [],
}];

const settlement = {
  status: "computed",
  gratuity: "0.00",
  leavePay: "0.00",
  total: "0.00",
  outcome: "not-eligible",
  reason: "not eligible: 0 completed years is below the minimum",
  notComputed: ["notice pay", "deductions", "other dues"],
  trace: [],
  explanation: { en: "Sample explanation.", ar: "شرح نموذجي.",
    arReviewed: false },
  includedInSif: false,
};

const payslip = {
  id: IDS.payslip,
  payRunId: IDS.payRun,
  employeeId: IDS.employee,
  employeeName: "Sample Employee",
  period,
  lines: [{ code: "basic", label: "Basic salary", amount: SALARY_SENTINEL,
    sifBucket: "fixed", kind: "recurring", traceId: "pay.basic" }],
  gross: SALARY_SENTINEL,
  net: SALARY_SENTINEL,
  notComputed,
  settlement: null,
  trace,
  reimbursements: [],
  reimbursementTotal: "0.00",
  salaryNet: SALARY_SENTINEL,
  reimbursementNote: null,
};

const payRun = {
  id: IDS.payRun,
  period,
  status: "draft",
  createdBy: IDS.user,
  approvedBy: null,
  createdAt: "2026-03-28T08:00:00Z",
  approvedAt: null,
  inputHash: "a".repeat(64),
  employeeCount: 1,
  gross: SALARY_SENTINEL,
  notComputed,
  sifFileId: null,
  reimbursementTotal: "0.00",
  claimCount: 0,
  pendingClaimCount: 0,
};

const sifFile = {
  id: IDS.sifFile,
  payRunId: IDS.payRun,
  fileName: "0000000123456260401000000.SIF",
  total: SALARY_SENTINEL,
  createdAt: "2026-03-31T21:00:00Z",
  findings: [],
  errorCount: 0,
  warningCount: 0,
  statement: SIF_STATEMENT,
};

const auditEvent = {
  id: IDS.audit,
  seq: 1,
  at: "2026-03-01T08:00:00Z",
  actorUserId: IDS.user,
  action: "company.updated",
  entityType: "company",
  entityId: IDS.company,
  data: { changed: ["wps"] },
  prevHash: "0".repeat(64),
  hash: "b".repeat(64),
};

export const PAY_EXAMPLES: Record<string, unknown> = {
  Settlement: settlement,
  Payslip: payslip,
  PayslipList: { items: [payslip] },
  PayRun: payRun,
  PayRunList: { items: [payRun] },
  SifFile: sifFile,
  SifText: "SCR,...\n",
  AuditEventPage: { items: [auditEvent], nextBefore: null },
  AuditVerifyResult: { ok: true, checked: 1, firstBadSeq: null },
};
