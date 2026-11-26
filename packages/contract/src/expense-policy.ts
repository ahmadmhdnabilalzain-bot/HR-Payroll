import { z } from "zod";
import { Id, IsoDate, listOf, Money, text } from "./primitives";

/** A name or label (safe free text). */
const Name = text(1, 200);
import { Role } from "./roles";

/** A short company-entered code: lower case, digits and hyphens. */
export const PolicyCode = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);

export const ExpenseKind = z.enum(["receipt", "mileage", "per-diem"]);
export type ExpenseKind = z.infer<typeof ExpenseKind>;

export const ExpenseCategory = z.object({
  id: Id,
  code: PolicyCode,
  name: Name,
  nameAr: z.string().max(200).nullable(),
  kind: ExpenseKind,
  active: z.boolean(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategory>;

export const ExpenseCategoryList = listOf(ExpenseCategory);

export const ExpenseCategoryCreate = z.object({
  code: PolicyCode,
  name: Name,
  nameAr: text(0, 200).nullable().optional(),
  kind: ExpenseKind,
});
export type ExpenseCategoryCreate = z.infer<typeof ExpenseCategoryCreate>;

export const ExpenseCategoryUpdate = z.object({
  name: Name.optional(),
  nameAr: text(0, 200).nullable().optional(),
  active: z.boolean().optional(),
});
export type ExpenseCategoryUpdate = z.infer<typeof ExpenseCategoryUpdate>;

/** `role: null` is the default row for every role. */
export const ExpenseLimit = z.object({
  categoryId: Id,
  role: Role.nullable(),
  perItemMax: Money.nullable(),
  monthlyMax: Money.nullable(),
  receiptRequiredAbove: Money.nullable(),
  overLimit: z.enum(["block", "flag"]),
});
export type ExpenseLimit = z.infer<typeof ExpenseLimit>;

/** Company policy values, not statutory rates; there is no default. */
export const MileageRate = z.object({
  code: PolicyCode,
  label: Name,
  perKm: Money,
  effectiveFrom: IsoDate,
});
export type MileageRate = z.infer<typeof MileageRate>;

export const PerDiemRate = z.object({
  code: PolicyCode,
  label: Name,
  labelAr: text(0, 200).nullable(),
  daily: Money,
  effectiveFrom: IsoDate,
});
export type PerDiemRate = z.infer<typeof PerDiemRate>;

/**
 * Receipt uploads per user and per company per Dubai day. A product
 * default against storage abuse, not a statutory value; the company
 * may change it in its expense policy.
 */
export const ReceiptQuota = z.object({
  perUserPerDay: z.number().int().min(1).max(10_000),
  perCompanyPerDay: z.number().int().min(1).max(100_000),
});
export type ReceiptQuota = z.infer<typeof ReceiptQuota>;

export const RECEIPT_QUOTA_DEFAULT: ReceiptQuota = {
  perUserPerDay: 50,
  perCompanyPerDay: 1000,
};

const policyBody = {
  claimWindowDays: z.number().int().min(1).max(3650).nullable(),
  limits: z.array(ExpenseLimit).max(500),
  mileageRates: z.array(MileageRate).max(50),
  perDiemRates: z.array(PerDiemRate).max(100),
};

export const ExpensePolicy = z.object({
  version: z.number().int().min(0),
  ...policyBody,
  receiptQuota: ReceiptQuota,
});
export type ExpensePolicy = z.infer<typeof ExpensePolicy>;

export const ExpensePolicyUpdate = z.object({
  ...policyBody,
  /** Omitted: the stored quota (or the product default) is kept. */
  receiptQuota: ReceiptQuota.optional(),
  expectedVersion: z.number().int().min(0),
});
export type ExpensePolicyUpdate = z.infer<typeof ExpensePolicyUpdate>;
