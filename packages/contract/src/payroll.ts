import { z } from "zod";
import { ComponentCode, SifBucket } from "./employee";
import { ErrorCodeSchema } from "./errors";
import { Id, Money, Name, Period, Timestamp } from "./primitives";
import { TraceLine } from "./trace";

/** No sourced rule yet: listed on every pay run and payslip. */
export const NOT_COMPUTED_PAY = [
  "proration for partial months",
  "overtime premiums",
  "unpaid leave deductions",
  "deductions and deduction caps",
  "GPSSA pension contributions",
  "ILOE premiums",
  "notice pay",
] as const;

/**
 * Listed in a computed settlement's notComputed when the entry gave no
 * serviceUnpaidLeaveDays (the gratuity then assumes none).
 */
export const SERVICE_UNPAID_LEAVE_NOT_ENTERED =
  "unpaid leave over service (not entered)";

export const PayRunEntry = z.object({
  employeeId: Id,
  componentOverrides: z
    .array(z.object({ code: ComponentCode, amount: Money }))
    .max(30)
    .optional(),
  oneOffs: z
    .array(z.object({
      code: ComponentCode,
      label: Name,
      amount: Money,
      sifBucket: SifBucket.exclude(["fixed"]),
    }))
    .max(30)
    .optional(),
  unusedLeaveDays: z.number().int().min(0).optional(),
  /**
   * Leavers only: unpaid leave days over the whole service, passed to
   * the gratuity calculation. Omitted means 0 and the settlement lists
   * SERVICE_UNPAID_LEAVE_NOT_ENTERED under notComputed.
   */
  serviceUnpaidLeaveDays: z.number().int().min(0).optional(),
});
export type PayRunEntry = z.infer<typeof PayRunEntry>;

export const PayRunCreate = z.object({
  period: Period,
  entries: z.array(PayRunEntry).max(1000),
});
export type PayRunCreate = z.infer<typeof PayRunCreate>;

export const PayRunProblem = z.object({
  employeeId: Id,
  code: ErrorCodeSchema,
  missing: z.array(z.string()),
});
export type PayRunProblem = z.infer<typeof PayRunProblem>;

export const PayRunStatus = z.enum(["draft", "approved", "void"]);

export const PayRun = z.object({
  id: Id,
  period: Period,
  status: PayRunStatus,
  createdBy: Id,
  approvedBy: Id.nullable(),
  createdAt: Timestamp,
  approvedAt: Timestamp.nullable(),
  inputHash: z.string().regex(/^[0-9a-f]{64}$/),
  employeeCount: z.number().int().min(0),
  gross: Money,
  notComputed: z.array(z.string()),
  /** The run's SIF file once generated (one per run), else null. */
  sifFileId: Id.nullable(),
});
export type PayRun = z.infer<typeof PayRun>;

/** Idempotency key for `POST /v1/pay-runs` (header names lower-case). */
export const PayRunCreateHeaders = z.object({
  "idempotency-key": z.string().min(1).max(100),
});

export const PayslipLine = z.object({
  code: ComponentCode,
  label: z.string(),
  amount: Money,
  sifBucket: SifBucket,
  kind: z.enum(["recurring", "override", "one-off"]),
  traceId: z.string(),
});
export type PayslipLine = z.infer<typeof PayslipLine>;

const SettlementComputed = z.object({
  status: z.literal("computed"),
  gratuity: Money,
  leavePay: Money,
  total: Money,
  outcome: z.enum(["paid", "not-eligible", "not-applicable"]),
  reason: z.string(),
  notComputed: z.array(z.string()),
  trace: z.array(TraceLine),
  explanation: z.object({
    en: z.string(),
    ar: z.string(),
    arReviewed: z.literal(false),
  }),
  includedInSif: z.literal(false),
});

const SettlementRefused = z.object({
  status: z.literal("refused"),
  code: z.string(),
  message: z.string(),
});

export const Settlement = z.discriminatedUnion("status", [
  SettlementComputed,
  SettlementRefused,
]);
export type Settlement = z.infer<typeof Settlement>;

export const Payslip = z.object({
  id: Id,
  payRunId: Id,
  employeeId: Id,
  employeeName: z.string(),
  period: Period,
  lines: z.array(PayslipLine),
  gross: Money,
  net: Money,
  notComputed: z.array(z.string()),
  settlement: Settlement.nullable(),
  trace: z.array(TraceLine),
});
export type Payslip = z.infer<typeof Payslip>;
