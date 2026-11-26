import {
  ReceiptSuggestion,
  type ReceiptContentType,
} from "@payroll/contract";
import type { Logger } from "../deps";

/**
 * An OCR port. Its output is untrusted: it is schema-checked, stored
 * as a suggestion and never copied into an expense item.
 */
export interface ReceiptReader {
  read(bytes: Uint8Array, type: ReceiptContentType): Promise<unknown>;
}

/** The default: no OCR is built, so nothing is suggested. */
export const nullReceiptReader: ReceiptReader = {
  read: async () => ({ source: "none" }),
};

const NONE: ReceiptSuggestion = { source: "none" };

/**
 * The reader's suggestion, or `{ source: "none" }` when it throws or
 * returns anything the schema refuses. The log line never carries the
 * reader's output or error text.
 */
export async function readSuggestion(reader: ReceiptReader,
  bytes: Uint8Array, type: ReceiptContentType, log: Logger,
  requestId: string): Promise<ReceiptSuggestion> {
  let out: unknown;
  try {
    out = await reader.read(bytes, type);
  } catch {
    log({ event: "receipt.reader.failed", requestId, reason: "threw" });
    return NONE;
  }
  const parsed = ReceiptSuggestion.safeParse(out);
  if (parsed.success) return parsed.data;
  log({ event: "receipt.reader.failed", requestId, reason: "invalid" });
  return NONE;
}
