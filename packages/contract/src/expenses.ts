import { z } from "zod";
import { ApprovalView } from "./approvals";
import { PolicyCode } from "./expense-policy";
import { Id, IsoDate, listOf, Money, text, Timestamp } from "./primitives";
import { Trn } from "./receipts";

/** Carried on every claim and every VAT report. */
export const VAT_STATEMENT = "VAT amounts and supplier TRNs are as " +
  "entered by the claimant. Input VAT recovery is not assessed: FTA " +
  "Decision 17 of 2026 on employee expenses is known only from " +
  "secondary summaries.";

/** Input VAT recovery is never computed (no sourced rule). */
export const VatRecoverability = z.literal("not-assessed");

const common = {
  categoryId: Id,
  date: IsoDate,
  description: text(1, 200),
  receiptIds: z.array(Id).max(10),
  justification: text(3, 500).optional(),
};

const ReceiptItemInput = z.object({
  kind: z.literal("receipt"),
  ...common,
  /** VAT inclusive. */
  amount: Money,
  vatAmount: Money,
  supplierName: text(1, 120).nullable(),
  supplierTrn: Trn.nullable(),
  /** Information only: no exchange rate is applied (AED only). */
  originalCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
  originalAmount: z.string().regex(/^\d{1,12}(\.\d{1,3})?$/).optional(),
});

/** Whole kilometres priced at a dated company rate. */
const MileageItemInput = z.object({
  kind: z.literal("mileage"),
  ...common,
  distanceKm: z.number().int().min(1).max(5000),
  rateCode: PolicyCode,
});

/** Whole days priced at a dated company rate. */
const PerDiemItemInput = z.object({
  kind: z.literal("per-diem"),
  ...common,
  days: z.number().int().min(1).max(60),
  rateCode: PolicyCode,
});

export const ExpenseItemInput = z.discriminatedUnion("kind", [
  ReceiptItemInput, MileageItemInput, PerDiemItemInput,
]);
export type ExpenseItemInput = z.infer<typeof ExpenseItemInput>;

const priced = {
  id: Id,
  rateApplied: Money.nullable(),
  overLimit: z.boolean(),
};
const rated = {
  ...priced,
  amount: Money,
  vatAmount: z.literal("0.00"),
  supplierTrn: z.null(),
};

export const ExpenseItem = z.discriminatedUnion("kind", [
  ReceiptItemInput.extend(priced),
  MileageItemInput.extend(rated),
  PerDiemItemInput.extend(rated),
]);
export type ExpenseItem = z.infer<typeof ExpenseItem>;

export const ClaimStatus = z.enum(["draft", "submitted", "returned",
  "approved", "rejected", "cancelled", "reimbursed"]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const ClaimFlagCode = z.enum(["OVER_LIMIT", "POSSIBLE_DUPLICATE",
  "DUPLICATE_RECEIPT", "VAT_WITHOUT_TRN", "FOREIGN_CURRENCY"]);
export type ClaimFlagCode = z.infer<typeof ClaimFlagCode>;

export const ClaimFlag = z.object({
  code: ClaimFlagCode,
  itemId: Id.nullable(),
  message: z.string(),
});
export type ClaimFlag = z.infer<typeof ClaimFlag>;

export const ExpenseClaim = z.object({
  id: Id,
  employeeId: Id,
  employeeName: z.string(),
  title: z.string(),
  status: ClaimStatus,
  items: z.array(ExpenseItem),
  total: Money,
  vatTotal: Money,
  flags: z.array(ClaimFlag),
  createdBy: Id,
  submittedAt: Timestamp.nullable(),
  decidedAt: Timestamp.nullable(),
  payRunId: Id.nullable(),
  policyVersion: z.number().int().min(0).nullable(),
  approval: ApprovalView.nullable(),
  vatRecoverability: VatRecoverability,
  /** Always the fixed VAT_STATEMENT text (owner decision, M-5). */
  vatStatement: z.literal(VAT_STATEMENT),
});
export type ExpenseClaim = z.infer<typeof ExpenseClaim>;

export const ExpenseClaimList = listOf(ExpenseClaim);

const Title = text(1, 120);

export const ExpenseClaimCreate = z.object({
  employeeId: Id.optional(),
  title: Title,
  items: z.array(ExpenseItemInput).max(50),
});
export type ExpenseClaimCreate = z.infer<typeof ExpenseClaimCreate>;

export const ExpenseClaimUpdate = z.object({
  title: Title.optional(),
  items: z.array(ExpenseItemInput).max(50).optional(),
});
export type ExpenseClaimUpdate = z.infer<typeof ExpenseClaimUpdate>;

export const ClaimCancel = z.object({
  note: text(3, 500).optional(),
});
export type ClaimCancel = z.infer<typeof ClaimCancel>;

export const ExpenseClaimQuery = z.object({
  employeeId: Id.optional(),
  status: ClaimStatus.optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
});
export type ExpenseClaimQuery = z.infer<typeof ExpenseClaimQuery>;

/**
 * Problems a save or submit can report, inside a CLAIM_PROBLEMS body's
 * `detail.problems` as "items.<n>:<CODE>" or "claim:<CODE>". Every
 * problem is reported, not the first only.
 */
export const CLAIM_PROBLEM_CODES = [
  "CLAIM_EMPTY",
  "CATEGORY_NOT_FOUND",
  "CATEGORY_INACTIVE",
  "CATEGORY_KIND_MISMATCH",
  "RATE_NOT_FOUND",
  "EXPENSE_DATE_IN_FUTURE",
  "EXPENSE_BEFORE_JOINING",
  "EXPENSE_TOO_OLD",
  "VAT_EXCEEDS_AMOUNT",
  "RECEIPT_REQUIRED",
  "RECEIPT_NOT_FOUND",
  "EXPENSE_OVER_LIMIT",
  "JUSTIFICATION_REQUIRED",
] as const;
export type ClaimProblemCode = (typeof CLAIM_PROBLEM_CODES)[number];
