import { EngineError } from "./errors";
import type { RoundingMode } from "./money";
import { requireParam } from "./rules/select";
import type { ParamValue, RulePack } from "./rules/types";
import { traceRule } from "./trace";
import type { TraceRule } from "./trace-types";

/** A pack parameter checked for its type, with its trace rule. */
export interface Typed<T> {
  v: T;
  rule: TraceRule;
}

type Overrides = Record<string, ParamValue> | undefined;

const ROUNDING_MODES: readonly string[] = ["HALF_UP", "HALF_EVEN", "DOWN",
  "UP"];

function invalid(key: string, value: ParamValue, want: string): never {
  throw new EngineError("INVALID_PARAM", `param ${key} must be ${want}`, {
    key,
    value: String(value),
  });
}

function read(pack: RulePack, key: string, ov: Overrides) {
  const p = requireParam(pack, key, ov);
  return { value: p.value, rule: traceRule(p) };
}

export function intParam(
  pack: RulePack,
  key: string,
  ov: Overrides,
  min: number,
): Typed<bigint> {
  const { value, rule } = read(pack, key, ov);
  if (typeof value !== "number" || !Number.isSafeInteger(value) ||
    value < min) {
    invalid(key, value, `a whole number of at least ${min}`);
  }
  return { v: BigInt(value), rule };
}

export function boolParam(
  pack: RulePack,
  key: string,
  ov: Overrides,
): Typed<boolean> {
  const { value, rule } = read(pack, key, ov);
  if (typeof value !== "boolean") invalid(key, value, "true or false");
  return { v: value, rule };
}

export function fixedParam<T extends ParamValue>(
  pack: RulePack,
  key: string,
  ov: Overrides,
  supported: T,
): Typed<T> {
  const { value, rule } = read(pack, key, ov);
  if (value !== supported) {
    invalid(key, value, `${String(supported)} (the only supported value)`);
  }
  return { v: supported, rule };
}

export function roundingParam(
  pack: RulePack,
  ov: Overrides,
): Typed<RoundingMode> {
  const { value, rule } = read(pack, "roundingMode", ov);
  if (typeof value !== "string" || !ROUNDING_MODES.includes(value)) {
    invalid("roundingMode", value, ROUNDING_MODES.join(" or "));
  }
  return { v: value as RoundingMode, rule };
}

export interface GratuityParams {
  minServiceYears: Typed<bigint>;
  tier1DaysPerYear: Typed<bigint>;
  tier1Years: Typed<bigint>;
  tier2DaysPerYear: Typed<bigint>;
  capYearsOfWage: Typed<bigint>;
  capBase: Typed<"basic">;
  basicWageOnly: Typed<true>;
  nationalsExcluded: Typed<true>;
  unpaidDaysExcluded: Typed<boolean>;
  dailyWageDivisor: Typed<bigint>;
  partYearProRata: Typed<boolean>;
  monthsPerYear: Typed<bigint>;
  yearDayCount: Typed<bigint>;
  endDateInclusive: Typed<boolean>;
  leapDayAnniversary: Typed<"clamp-to-last-day-of-month">;
  roundingMode: Typed<RoundingMode>;
}

export function loadGratuityParams(
  pack: RulePack,
  ov: Overrides,
): GratuityParams {
  return {
    minServiceYears: intParam(pack, "minServiceYears", ov, 0),
    tier1DaysPerYear: intParam(pack, "tier1DaysPerYear", ov, 0),
    tier1Years: intParam(pack, "tier1Years", ov, 0),
    tier2DaysPerYear: intParam(pack, "tier2DaysPerYear", ov, 0),
    capYearsOfWage: intParam(pack, "capYearsOfWage", ov, 1),
    capBase: fixedParam(pack, "capBase", ov, "basic"),
    basicWageOnly: fixedParam(pack, "basicWageOnly", ov, true),
    nationalsExcluded: fixedParam(pack, "nationalsExcluded", ov, true),
    unpaidDaysExcluded: boolParam(pack, "unpaidDaysExcluded", ov),
    dailyWageDivisor: intParam(pack, "dailyWageDivisor", ov, 1),
    partYearProRata: boolParam(pack, "partYearProRata", ov),
    monthsPerYear: intParam(pack, "monthsPerYear", ov, 1),
    yearDayCount: intParam(pack, "yearDayCount", ov, 1),
    endDateInclusive: boolParam(pack, "endDateInclusive", ov),
    leapDayAnniversary: fixedParam(pack, "leapDayAnniversary", ov,
      "clamp-to-last-day-of-month"),
    roundingMode: roundingParam(pack, ov),
  };
}
