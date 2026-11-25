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

/**
 * paid: the worker qualifies. not-eligible: the rule applies but the
 * worker does not qualify (under the minimum service). not-applicable:
 * the Labour Law gratuity does not apply to this worker class.
 */
export type GratuityOutcome = "paid" | "not-eligible" | "not-applicable";

export interface GratuityResult {
  amount: Fils;
  outcome: GratuityOutcome;
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

const GCC_KEY = "gccNationalGratuity";
const GCC_MESSAGE = "GCC national gratuity is not supported yet: no " +
  "sourced rule exists for GCC nationals";

/**
 * No sourced rule exists, and an override value alone cannot say how to
 * apply one, so GCC nationals are always refused. Without an override the
 * code stays UNSOURCED_PARAM, with this message instead of the generic
 * advice to supply an override.
 */
function refuseGccNational(pack: RulePack, ov: Overrides): never {
  try {
    requireParam(pack, GCC_KEY, ov);
  } catch (e) {
    if (!(e instanceof EngineError) || e.code !== "UNSOURCED_PARAM") throw e;
    throw new EngineError("UNSOURCED_PARAM", GCC_MESSAGE,
      { ...e.detail, workerClass: "gcc-national" });
  }
  throw new EngineError("UNSUPPORTED_WORKER_CLASS", GCC_MESSAGE,
    { workerClass: "gcc-national", key: GCC_KEY });
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
      "an anniversary day missing from its month (29 February) is " +
      "placed by leapDayAnniversary",
    inputs: { joiningDate: input.joiningDate, exclusiveEnd: s.exclusiveEnd,
      lastAnniversary: s.lastAnniversary,
      leftoverDays: String(s.leftoverDays) },
    result: `${s.completedYears} years and ${s.leftoverDays} days`,
    rules: [p.minServiceYears.rule, p.leapDayAnniversary.rule,
      p.endDateInclusive.rule],
  });
}

function zeroResult(s: ServiceLength, outcome: GratuityOutcome,
  reason: string): GratuityResult {
  return { amount: fils(0n), outcome, eligible: false, reason,
    completedYears: s.completedYears, leftoverDays: s.leftoverDays };
}

function notApplicable(
  t: TraceBuilder,
  s: ServiceLength,
  p: GratuityParams,
): GratuityResult {
  const reason = UAE_NATIONAL_REASON;
  t.add({
    id: "gratuity.total", label: "Gratuity (not applicable)",
    formula: "0 when nationalsExcluded",
    inputs: { outcome: "not-applicable", reason },
    result: "0", rules: [p.nationalsExcluded.rule],
  });
  return zeroResult(s, "not-applicable", reason);
}

function notEligible(
  t: TraceBuilder,
  s: ServiceLength,
  p: GratuityParams,
): GratuityResult {
  const years = BigInt(s.completedYears);
  const min = p.minServiceYears.v;
  const reason = `not eligible: ${years} completed years is below ` +
    `the minimum of ${min} (Decree-Law 33 of 2021, Article 51)`;
  t.add({
    id: "gratuity.total", label: "Gratuity (not eligible)",
    formula: "0 when completedYears < minServiceYears",
    inputs: { outcome: "not-eligible", reason,
      completedYears: String(years), minServiceYears: String(min) },
    result: "0", rules: [p.minServiceYears.rule],
  });
  return zeroResult(s, "not-eligible", reason);
}

function expatResult(
  t: TraceBuilder,
  input: GratuityInput,
  s: ServiceLength,
  p: GratuityParams,
): GratuityResult {
  const years = BigInt(s.completedYears);
  const min = p.minServiceYears.v;
  if (years < min) return notEligible(t, s, p);
  const amount = eligibleAmount(t, input.lastBasicMonthly, s, p);
  return { amount, outcome: "paid", eligible: true,
    reason: `eligible: ${years} completed years, minimum ${min}`,
    completedYears: s.completedYears, leftoverDays: s.leftoverDays };
}

export function calculateGratuity(
  input: GratuityInput,
  packs: readonly RulePack[],
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
      unpaidDaysExcluded: p.unpaidDaysExcluded.v,
      leapDayAnniversary: p.leapDayAnniversary.v });
  const t = new TraceBuilder();
  traceService(t, input, s, p);
  const value = input.workerClass === "uae-national"
    ? notApplicable(t, s, p)
    : expatResult(t, input, s, p);
  return { value, trace: t.lines() };
}
