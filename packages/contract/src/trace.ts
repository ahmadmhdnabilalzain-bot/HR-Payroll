import { z } from "zod";

/** Same strings as the engine's `RuleStatus`. */
export const RuleStatus = z.enum([
  "official",
  "secondary",
  "convention",
  "hypothetical",
  "unsourced",
]);
export type RuleStatus = z.infer<typeof RuleStatus>;

/** Same fields as `packages/engine/src/trace-types.ts` `TraceRule`. */
export const TraceRule = z.object({
  key: z.string(),
  value: z.string(),
  status: RuleStatus,
  packId: z.string(),
  packVersion: z.string(),
  overridden: z.boolean(),
});
export type TraceRule = z.infer<typeof TraceRule>;

/**
 * Wire encoding of `TraceLine.result` on payslip `pay.*` lines (and on
 * the engine's money lines, e.g. `gratuity.amount`, `leave.pay`,
 * `settlement.total`; not on `service.days` or `service.years`, whose
 * results are counts): the amount in integer fils as a
 * decimal string, no separators, no sign, as the engine writes it
 * (`String(fils)`). AED 7,777.77 is `"777777"`. The payslip line's
 * `amount` carries the same value as `Money` ("7777.77"). Clients
 * format `result` with `Number(result) / 100` only for display.
 */
export const PAY_TRACE_RESULT = z.string().regex(/^(0|[1-9]\d*)$/);
export const PAY_TRACE_RESULT_EXAMPLE = {
  amount: "7777.77",
  result: "777777",
} as const;

/** Same fields as the engine's `TraceLine`. */
export const TraceLine = z.object({
  id: z.string(),
  label: z.string(),
  formula: z.string(),
  inputs: z.record(z.string(), z.string()),
  result: z.string(),
  rules: z.array(TraceRule),
});
export type TraceLine = z.infer<typeof TraceLine>;
