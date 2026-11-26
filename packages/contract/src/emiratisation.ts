import { z } from "zod";
import { Id, IsoDate, Money, Timestamp } from "./primitives";
import { TraceLine } from "./trace";

/** HR-entered counting conditions; null means not entered yet. */
export const EmiratisationFlags = z.object({
  skilled: z.boolean().nullable(),
  workPermitValid: z.boolean().nullable(),
  paidViaWps: z.boolean().nullable(),
  gpssaRegistered: z.boolean().nullable(),
});
export type EmiratisationFlags = z.infer<typeof EmiratisationFlags>;

/**
 * A literal copy of the engine's list of unsourced params a company
 * may enter itself (a test checks the two match).
 */
export const EMIRATISATION_OVERRIDABLE = [
  "largeTargetBps_2025-06-30",
  "largeTargetBps_2026-06-30",
  "largeRequiredRounding",
  "midRequired_2026-12-31",
  "finePerPostPerYear_2026",
] as const;

const WholeNumber = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

/** The value shape of each override key. */
export const OVERRIDE_VALUE: Readonly<Record<string, z.ZodType>> = {
  "largeTargetBps_2025-06-30": WholeNumber.max(10000),
  "largeTargetBps_2026-06-30": WholeNumber.max(10000),
  largeRequiredRounding: z.enum(["DOWN", "HALF_UP", "UP"]),
  "midRequired_2026-12-31": WholeNumber,
  finePerPostPerYear_2026: WholeNumber,
};

const overridable = (k: string) =>
  (EMIRATISATION_OVERRIDABLE as readonly string[]).includes(k);

export const EmiratisationSettingsPut = z.object({
  sectorInScope: z.boolean().nullable(),
  overrides: z.record(z.string(), z.union([z.number(), z.string()])),
}).superRefine((v, ctx) => {
  for (const [k, x] of Object.entries(v.overrides)) {
    if (!overridable(k)) {
      ctx.addIssue({ code: "custom", path: ["overrides", k],
        message: "this key cannot be overridden" });
    } else if (!OVERRIDE_VALUE[k]!.safeParse(x).success) {
      ctx.addIssue({ code: "custom", path: ["overrides", k],
        message: "value has the wrong form" });
    }
  }
});
export type EmiratisationSettingsPut =
  z.infer<typeof EmiratisationSettingsPut>;

export const EmiratisationSettings = z.object({
  sectorInScope: z.boolean().nullable(),
  overrides: z.record(z.string(), z.union([z.number(), z.string()])),
  updatedAt: Timestamp.nullable(),
});
export type EmiratisationSettings = z.infer<typeof EmiratisationSettings>;

export const NotCountedReason = z.enum(["flags-not-entered",
  "work-permit-not-valid", "not-paid-via-wps", "not-gpssa-registered",
  "below-minimum-wage"]);
export type NotCountedReason = z.infer<typeof NotCountedReason>;

/** A planning estimate from secondary sources, never legal advice. */
export const EmiratisationReport = z.object({
  asOf: IsoDate,
  checkpoint: IsoDate.nullable(),
  band: z.enum(["large", "mid", "none", "unknown"]),
  status: z.enum(["on-target", "below-target", "not-applicable",
    "needs-input"]),
  headcount: z.number().int().min(0),
  skilledHeadcount: z.number().int().min(0).nullable(),
  nationals: z.number().int().min(0),
  countedNationals: z.number().int().min(0),
  required: z.number().int().min(0).nullable(),
  shortfall: z.number().int().min(0).nullable(),
  notCounted: z.array(z.object({ employeeId: Id,
    reasons: z.array(NotCountedReason) })),
  missingInputs: z.array(z.string()),
  missingParams: z.array(z.string()),
  fineExposure: Money.nullable(),
  fineNote: z.string().nullable(),
  trace: z.array(TraceLine),
  disclaimer: z.string(),
});
export type EmiratisationReport = z.infer<typeof EmiratisationReport>;

export const EmiratisationQuery = z.object({ asOf: IsoDate.optional() });
