import { IDS } from "./examples-people";
import { VAT_STATEMENT } from "./expenses";
import { REIMBURSEMENT_WPS_NOTE } from "./payroll";

const X = (n: string) => `00000000-0000-4000-8000-0000000006${n}`;
export const EXPENSE_IDS = {
  claim: X("01"),
  item: X("02"),
  item2: X("03"),
  receipt: X("04"),
  approval: X("05"),
  meals: X("06"),
  mileage: X("07"),
} as const;
const AT = "2026-03-10T08:00:00Z";
const I = EXPENSE_IDS;

const approval = {
  id: I.approval,
  subjectType: "expense-claim",
  subjectId: I.claim,
  status: "pending",
  currentStep: 1,
  steps: [{ order: 1, approver: { kind: "line-manager" },
    status: "pending", decidedBy: null, decidedAt: null, note: null }],
  createdAt: AT,
};

const chain = {
  subjectType: "expense-claim",
  version: 0,
  tiers: [{ approver: { kind: "line-manager" }, minTotal: "0.00" }],
  overLimitApprover: "owner",
};

const receipt = {
  id: I.receipt,
  employeeId: IDS.employee,
  fileName: "dinner.png",
  contentType: "image/png",
  size: 48213,
  sha256: "c".repeat(64),
  uploadedAt: AT,
  suggestion: { source: "none" },
  duplicateOf: [],
};

const category = { id: I.meals, code: "meals", name: "Meals",
  nameAr: null, kind: "receipt", active: true };

const policy = {
  version: 1,
  claimWindowDays: 90,
  limits: [{ categoryId: I.meals, role: null, perItemMax: "500.00",
    monthlyMax: null, receiptRequiredAbove: "50.00", overLimit: "flag" }],
  mileageRates: [{ code: "car", label: "Own car", perKm: "0.75",
    effectiveFrom: "2026-01-01" }],
  perDiemRates: [],
};

const claim = {
  id: I.claim,
  employeeId: IDS.employee,
  employeeName: "Sample Employee",
  title: "Client visit, Abu Dhabi",
  status: "submitted",
  items: [
    { kind: "receipt", id: I.item, categoryId: I.meals,
      date: "2026-03-09", description: "Client dinner",
      receiptIds: [I.receipt], amount: "150.00", vatAmount: "7.14",
      supplierName: "Sample Restaurant", supplierTrn: "100000000000003",
      rateApplied: null, overLimit: false },
    { kind: "mileage", id: I.item2, categoryId: I.mileage,
      date: "2026-03-09", description: "Dubai to Abu Dhabi",
      receiptIds: [], distanceKm: 120, rateCode: "car", amount: "90.00",
      vatAmount: "0.00", supplierTrn: null, rateApplied: "0.75",
      overLimit: false },
  ],
  total: "240.00",
  vatTotal: "7.14",
  flags: [],
  createdBy: IDS.user,
  submittedAt: AT,
  decidedAt: null,
  payRunId: null,
  policyVersion: 1,
  approval,
  vatRecoverability: "not-assessed",
};

const summary = {
  rows: [{ key: I.meals, label: "Meals", claimCount: 1, itemCount: 1,
    total: "150.00", vatTotal: "7.14" }],
  total: "150.00",
  vatTotal: "7.14",
  statement: VAT_STATEMENT,
};

const vatRegister = {
  rows: [{ claimId: I.claim, itemId: I.item, employeeNumber: "E-1",
    employeeName: "Sample Employee", date: "2026-03-09",
    categoryCode: "meals", supplierName: "Sample Restaurant",
    supplierTrn: "100000000000003", amount: "150.00", vatAmount: "7.14",
    netOfVat: "142.86", receiptCount: 1, status: "approved" }],
  statement: VAT_STATEMENT,
  vatRecoverability: "not-assessed",
};

const aging = { approvalId: I.approval, claimId: I.claim,
  employeeName: "Sample Employee", total: "240.00", stepOrder: 1,
  approver: { kind: "line-manager" }, submittedAt: AT, ageDays: 10 };

const unpaid = { claimId: I.claim, employeeId: IDS.employee,
  employeeName: "Sample Employee", total: "240.00", decidedAt: AT,
  reason: "awaiting-pay-run" };

const payouts = {
  payRunId: IDS.payRun,
  runStatus: "approved",
  rows: [{ employeeId: IDS.employee, employeeName: "Sample Employee",
    employeeNumber: "E-1", claimIds: [I.claim], total: "240.00" }],
  total: "240.00",
  note: REIMBURSEMENT_WPS_NOTE,
};

export const EXPENSE_EXAMPLES: Record<string, unknown> = {
  ApprovalView: approval,
  ApprovalChain: chain,
  ApprovalChainList: { items: [chain] },
  ApprovalTaskList: { items: [{ approvalId: I.approval,
    subjectType: "expense-claim", subjectId: I.claim, stepOrder: 1,
    stepCount: 1, submittedAt: AT, ageDays: 0, summary: {
      employeeName: "Sample Employee", title: claim.title,
      total: "240.00", flagCodes: [] } }] },
  Receipt: receipt,
  ReceiptContent: "(binary)",
  ExpenseCategory: category,
  ExpenseCategoryList: { items: [category] },
  ExpensePolicy: policy,
  ExpenseClaim: claim,
  ExpenseClaimList: { items: [claim] },
  SummaryReport: summary,
  VatRegister: vatRegister,
  AgingReport: { items: [aging] },
  UnpaidReport: { items: [unpaid] },
  Payouts: payouts,
};
