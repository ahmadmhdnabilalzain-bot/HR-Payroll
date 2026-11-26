import { z } from "zod";
import { ApproverSpec } from "./approvals";
import { ClaimStatus, VAT_STATEMENT, VatRecoverability } from "./expenses";
import { REIMBURSEMENT_WPS_NOTE, PayRunStatus } from "./payroll";
import { Id, IsoDate, listOf, Money, Timestamp } from "./primitives";

/** Reports answer JSON by default and CSV with `format=csv`. */
export const ReportFormat = z.enum(["json", "csv"]);

export const SummaryQuery = z.object({
  from: IsoDate,
  to: IsoDate,
  groupBy: z.enum(["category", "employee", "department", "status"]),
  payRunId: Id.optional(),
  format: ReportFormat.optional(),
});
export type SummaryQuery = z.infer<typeof SummaryQuery>;

export const SummaryRow = z.object({
  key: z.string(),
  label: z.string(),
  claimCount: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  total: Money,
  vatTotal: Money,
});
export type SummaryRow = z.infer<typeof SummaryRow>;

export const SummaryReport = z.object({
  rows: z.array(SummaryRow),
  total: Money,
  vatTotal: Money,
  statement: z.literal(VAT_STATEMENT),
});
export type SummaryReport = z.infer<typeof SummaryReport>;

export const VatRegisterQuery = z.object({
  from: IsoDate,
  to: IsoDate,
  format: ReportFormat.optional(),
});
export type VatRegisterQuery = z.infer<typeof VatRegisterQuery>;

export const VatRegisterRow = z.object({
  claimId: Id,
  itemId: Id,
  employeeNumber: z.string(),
  employeeName: z.string(),
  date: IsoDate,
  categoryCode: z.string(),
  supplierName: z.string().nullable(),
  supplierTrn: z.string().nullable(),
  amount: Money,
  vatAmount: Money,
  netOfVat: Money,
  receiptCount: z.number().int().min(0),
  status: ClaimStatus,
});
export type VatRegisterRow = z.infer<typeof VatRegisterRow>;

export const VatRegister = z.object({
  rows: z.array(VatRegisterRow),
  statement: z.literal(VAT_STATEMENT),
  vatRecoverability: VatRecoverability,
});
export type VatRegister = z.infer<typeof VatRegister>;

export const AgingRow = z.object({
  approvalId: Id,
  claimId: Id,
  employeeName: z.string(),
  total: Money,
  stepOrder: z.number().int().min(1),
  approver: ApproverSpec,
  submittedAt: Timestamp,
  ageDays: z.number().int().min(0),
});
export type AgingRow = z.infer<typeof AgingRow>;

export const AgingReport = listOf(AgingRow);

export const UnpaidRow = z.object({
  claimId: Id,
  employeeId: Id,
  employeeName: z.string(),
  total: Money,
  decidedAt: Timestamp,
  reason: z.enum(["awaiting-pay-run", "in-draft-run", "employee-left"]),
});
export type UnpaidRow = z.infer<typeof UnpaidRow>;

export const UnpaidReport = listOf(UnpaidRow);

export const PayoutsQuery = z.object({
  payRunId: Id,
  format: ReportFormat.optional(),
});
export type PayoutsQuery = z.infer<typeof PayoutsQuery>;

export const PayoutRow = z.object({
  employeeId: Id,
  employeeName: z.string(),
  employeeNumber: z.string(),
  claimIds: z.array(Id),
  total: Money,
});
export type PayoutRow = z.infer<typeof PayoutRow>;

/** A list for HR to pay by transfer, not a bank payment file. */
export const Payouts = z.object({
  payRunId: Id,
  runStatus: PayRunStatus,
  rows: z.array(PayoutRow),
  total: Money,
  note: z.literal(REIMBURSEMENT_WPS_NOTE),
});
export type Payouts = z.infer<typeof Payouts>;
