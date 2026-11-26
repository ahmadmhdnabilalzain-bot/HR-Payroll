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
