import { z } from "zod";
import { Id, IsoDate, Money, text, Timestamp } from "./primitives";

/** Receipt files: JPEG, PNG and PDF only, sniffed from the bytes. */
export const ReceiptContentType = z.enum(["image/jpeg", "image/png",
  "application/pdf"]);
export type ReceiptContentType = z.infer<typeof ReceiptContentType>;

/** 5 MiB of decoded bytes. */
export const RECEIPT_MAX_BYTES = 5_242_880;

/** A UAE TRN as 15 digits: a convention, not a sourced rule. */
export const Trn = z.string().regex(/^\d{15}$/);

export const ReceiptUpload = z.object({
  employeeId: Id.optional(),
  fileName: text(1, 120),
  contentType: ReceiptContentType,
  /** Standard base64 of the file (checked strictly by the server). */
  dataBase64: z.string().min(1).max(7_200_000),
});
export type ReceiptUpload = z.infer<typeof ReceiptUpload>;

/**
 * What a receipt reader suggested. A suggestion only: stored and
 * shown, never copied into an expense item by the server.
 */
export const ReceiptSuggestion = z.object({
  source: z.enum(["none", "ocr"]),
  amount: Money.optional(),
  vatAmount: Money.optional(),
  supplierTrn: Trn.optional(),
  supplierName: text(1, 120).optional(),
  date: IsoDate.optional(),
});
export type ReceiptSuggestion = z.infer<typeof ReceiptSuggestion>;

export const Receipt = z.object({
  id: Id,
  employeeId: Id,
  fileName: z.string(),
  contentType: ReceiptContentType,
  size: z.number().int().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  uploadedAt: Timestamp,
  suggestion: ReceiptSuggestion,
  /** Other receipts with the same bytes that the caller may see. */
  duplicateOf: z.array(Id),
});
export type Receipt = z.infer<typeof Receipt>;

/**
 * The download body: the file's raw bytes with its sniffed type. The
 * schema only names it; clients read the bytes, not JSON.
 */
export const ReceiptContent = z.string().describe("raw file bytes");
