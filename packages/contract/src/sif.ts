import { z } from "zod";
import { Id, Money, Timestamp } from "./primitives";

/** Carried by every SIF record. Never claim more than this. */
export const SIF_STATEMENT =
  "Layout matches two bank guides. Not confirmed by MOHRE or a bank test.";

export const Finding = z.object({
  code: z.string(),
  severity: z.enum(["error", "warning"]),
  line: z.number().int(),
  field: z.number().int().nullable(),
  message: z.string(),
  value: z.string(),
});
export type Finding = z.infer<typeof Finding>;

export const SifFile = z.object({
  id: Id,
  payRunId: Id,
  fileName: z.string(),
  total: Money,
  createdAt: Timestamp,
  findings: z.array(Finding),
  errorCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  statement: z.literal(SIF_STATEMENT),
  /**
   * Employees whose live bank details or labour id differ from the
   * approved run's. The file always uses the approved values.
   */
  bankChangedSinceApproval: z.array(Id).optional(),
});
export type SifFile = z.infer<typeof SifFile>;

/** The SIF text itself (`text/plain`). */
export const SifText = z.string();
