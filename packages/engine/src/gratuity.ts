import { EngineError } from "./errors";
import { eligibleAmount } from "./gratuity-amount";
import { loadGratuityParams, type GratuityParams } from "./gratuity-params";
import { fils, type Fils } from "./money";
import { requireParam, selectPack } from "./rules/select";
import type { ParamValue, RulePack } from "./rules/types";
import {
  assertDateRange,
  assertUnpaidDays,
  measureService,
  type ServiceLength,
} from "./service";
import { TraceBuilder } from "./trace";
import type { Traced } from "./trace-types";

export type WorkerClass = "expat-full-time" | "uae-national" | "gcc-national";

export interface GratuityInput {
  joiningDate: string;
  lastWorkingDate: string;
  unpaidLeaveDays: number;
  lastBasicMonthly: Fils;
  workerClass: WorkerClass;
}

export interface GratuityResult {
  amount: Fils;
  eligible: boolean;
  reason: string;
  completedYears: number;
  leftoverDays: number;
}

type Overrides = Record<string, ParamValue> | undefined;

const WORKER_CLASSES: readonly string[] = ["expat-full-time",
  "uae-national", "gcc-national"];

export const UAE_NATIONAL_REASON =
  "not applicable: UAE nationals' end-of-service benefits fall under the " +
  "federal pension and social security legislation, not the Labour Law " +
  "gratuity";

function validateInput(input: GratuityInput): void {
  assertDateRange(input.joiningDate, input.lastWorkingDate);
  assertUnpaidDays(input.unpaidLeaveDays, Number.MAX_SAFE_INTEGER);
  if (input.lastBasicMonthly <= 0n) {
    throw new EngineError("INVALID_AMOUNT", "basic salary must be positive",
      { value: String(input.lastBasicMonthly) });
  }
  if (!WORKER_CLASSES.includes(input.workerClass)) {
    throw new EngineError("UNSUPPORTED_WORKER_CLASS",
      `unknown worker class ${String(input.workerClass)}`,
      { value: String(input.workerClass) });
  }
}

/** No sourced rule exists; an override cannot say how to apply it. */
function refuseGccNational(pack: RulePack, ov: Overrides): never {
  requireParam(pack, "gccNationalGratuity", ov);
  throw new EngineError(
    "UNSUPPORTED_WORKER_CLASS",
    "GCC nationals have no sourced gratuity rule; an override value " +
      "alone cannot define the calculation",
    { workerClass: "gcc-national", key: "gccNationalGratuity" },
  );
}

function traceService(
  t: TraceBuilder,
  input: GratuityInput,
  s: ServiceLength,
  p: GratuityParams,
): void {
  t.add({
    id: "service.days", label: "Days of service",
    formula: "(lastWorkingDate + 1 day when endDateInclusive) - " +
      "unpaidLeaveDays when unpaidDaysExcluded - joiningDate",
    inputs: { joiningDate: input.joiningDate,
      lastWorkingDate: input.lastWorkingDate, totalDays: String(s.totalDays),
      unpaidLeaveDays: String(input.unpaidLeaveDays),
      exclusiveEnd: s.exclusiveEnd },
    result: String(s.serviceDays),
    rules: [p.endDateInclusive.rule, p.unpaidDaysExcluded.rule],
  });
  t.add({
    id: "service.years", label: "Completed years of service",
    formula: "whole anniversaries of joiningDate not after exclusiveEnd; " +
      "a 29 February anniversary falls on 28 February in a non-leap " +
      "year (engine convention)",
    inputs: { joiningDate: input.joiningDate, exclusiveEnd: s.exclusiveEnd,
      lastAnniversary: s.lastAnniversary,
      leftoverDays: String(s.leftoverDays) },
    result: `${s.completedYears} years and ${s.leftoverDays} days`,
    rules: [p.minServiceYears.rule],
  });
}

function notEligible(
  t: TraceBuilder,
  s: ServiceLength,
  reason: string,
  p: GratuityParams | null,
): GratuityResult {
  t.add({
    id: "gratuity.total", label: "Gratuity (not eligible)",
    formula: "0 when not eligible", inputs: { reason },
    result: "0", rules: p === null ? [] : [p.minServiceYears.rule],
  });
  return { amount: fils(0n), eligible: false, reason,
    completedYears: s.completedYears, leftoverDays: s.leftoverDays };
}

function expatResult(
  t: TraceBuilder,
  input: GratuityInput,
  s: ServiceLength,
  p: GratuityParams,
): GratuityResult {
  const years = BigInt(s.completedYears);
  const min = p.minServiceYears.v;
  if (years < min) {
    const reason = `not eligible: ${years} completed years is below ` +
      `the minimum of ${min} (Decree-Law 33 of 2021, Article 51)`;
    return notEligible(t, s, reason, p);
  }
  const amount = eligibleAmount(t, input.lastBasicMonthly, s, p);
  return { amount, eligible: true,
    reason: `eligible: ${years} completed years, minimum ${min}`,
    completedYears: s.completedYears, leftoverDays: s.leftoverDays };
}

export function calculateGratuity(
  input: GratuityInput,
  packs: RulePack[],
  overrides?: Record<string, ParamValue>,
): Traced<GratuityResult> {
  validateInput(input);
  const pack = selectPack(packs, input.lastWorkingDate);
  if (input.workerClass === "gcc-national") {
    refuseGccNational(pack, overrides);
  }
  const p = loadGratuityParams(pack, overrides);
  const s = measureService(input.joiningDate, input.lastWorkingDate,
    input.unpaidLeaveDays, { endDateInclusive: p.endDateInclusive.v,
      unpaidDaysExcluded: p.unpaidDaysExcluded.v });
  const t = new TraceBuilder();
  traceService(t, input, s, p);
  const value = input.workerClass === "uae-national"
    ? notEligible(t, s, UAE_NATIONAL_REASON, null)
    : expatResult(t, input, s, p);
  return { value, trace: t.lines() };
}
