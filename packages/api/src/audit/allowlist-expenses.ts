import { ClaimFlagCode, ReceiptContentType } from "@payroll/contract";

/**
 * Plan 6 audit keys: ids, counts, codes and types only. Never an
 * amount, VAT figure, TRN, supplier name or receipt content.
 */
type Check = (v: unknown) => boolean;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isInt = (v: unknown) => Number.isSafeInteger(v);
const oneOf = (values: readonly string[]): Check => (v) =>
  typeof v === "string" && values.includes(v);

export const EXPENSE_AUDIT_CHECKS: Record<string, Check> = {
  subjectType: oneOf(["expense-claim"]),
  stepCount: isInt,
  stepOrder: isInt,
  tierCount: isInt,
  itemCount: isInt,
  limitCount: isInt,
  rateCount: isInt,
  size: isInt,
  contentType: oneOf(ReceiptContentType.options),
  flagCodes: (v) => Array.isArray(v) &&
    v.every(oneOf(ClaimFlagCode.options)),
  payRunId: (v) => typeof v === "string" && UUID_RE.test(v),
};
