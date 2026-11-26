import {
  DocumentType,
  RetentionClass,
  type RetentionRule,
} from "@payroll/contract";

/**
 * Alert stages before a document expires: 60, 30 and 7 days for every
 * type. A `convention` (a company preference the owner can change in
 * the document settings), not law: no source sets these numbers.
 */
export const DEFAULT_LEAD_DAYS: Readonly<Record<DocumentType, number[]>> =
  Object.fromEntries(DocumentType.options.map((t) => [t, [60, 30, 7]])) as
    Record<DocumentType, number[]>;

/**
 * No retention period for any class: the PDPL text read sets none, so
 * the company sets one with its adviser. Nothing is deleted.
 */
export const DEFAULT_RETENTION: Readonly<Record<RetentionClass,
  RetentionRule>> = Object.fromEntries(RetentionClass.options.map((c) =>
  [c, { months: null, from: "employment-end" }])) as
    Record<RetentionClass, RetentionRule>;
