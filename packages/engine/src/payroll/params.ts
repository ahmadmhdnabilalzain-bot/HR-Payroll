import { EngineError } from "../errors";
import {
  boolParam,
  intParam,
  type Typed,
} from "../gratuity-params";
import type { RoundingMode } from "../money";
import { requireParam } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { traceRule } from "../trace";

export type Overrides = Record<string, ParamValue> | undefined;

export type RestDayPayMode = "extra-day-wage-plus-premium" |
  "premium-only";
export type GpssaRegime = "dl57-2023" | "law7-1999";

const MODES: readonly RoundingMode[] = ["HALF_UP", "HALF_EVEN", "DOWN",
  "UP"];

/** A string param that must be one of `allowed`. */
export function choiceParam<T extends string>(
  pack: RulePack,
  key: string,
  ov: Overrides,
  allowed: readonly T[],
): Typed<T> {
  const p = requireParam(pack, key, ov);
  const hit = allowed.find((a) => a === p.value);
  if (hit === undefined) {
    throw new EngineError("INVALID_PARAM",
      `param ${key} must be ${allowed.join(" or ")}`,
      { key, value: String(p.value) });
  }
  return { v: hit, rule: traceRule(p) };
}

export function modeParam(
  pack: RulePack,
  key: string,
  ov: Overrides,
): Typed<RoundingMode> {
  return choiceParam(pack, key, ov, MODES);
}

/** A non-empty string param, parsed later by its user. */
function textParam(pack: RulePack, key: string, ov: Overrides):
  Typed<string> {
  const p = requireParam(pack, key, ov);
  if (typeof p.value !== "string" || p.value === "") {
    throw new EngineError("INVALID_PARAM", `param ${key} must be text`,
      { key, value: String(p.value) });
  }
  return { v: p.value, rule: traceRule(p) };
}

export interface PayrollParams {
  overtimeUpliftBps: Typed<bigint>;
  nightOvertimeUpliftBps: Typed<bigint>;
  nightWindow: Typed<"22:00-04:00">;
  shiftWorkersNightExcluded: Typed<boolean>;
  overtimeMaxMinutesPerDay: Typed<bigint>;
  maxHoursPer3Weeks: Typed<bigint>;
  maxNormalHoursPerDay: Typed<bigint>;
  restDayUpliftBps: Typed<bigint>;
  holidayUpliftBps: Typed<bigint>;
  restDayPayMode: Typed<RestDayPayMode>;
  restDayWageBase: Typed<"wage">;
  dailyDivisor: Typed<bigint>;
  prorationBasis: Typed<"calendar-days">;
  sickFullPayDays: Typed<bigint>;
  sickHalfPayDays: Typed<bigint>;
  sickMaxDays: Typed<bigint>;
  sickPaidInProbation: Typed<boolean>;
  paidLeaveBase: Typed<"wage">;
  maternityFullPayDays: Typed<bigint>;
  maternityHalfPayDays: Typed<bigint>;
  maternityUnpaidExtraDays: Typed<bigint>;
  encashInServiceBase: Typed<"wage">;
  deductionOverallCapBps: Typed<bigint>;
  overpaymentCapBps: Typed<bigint>;
  violationCapBps: Typed<bigint>;
  violationCapDays: Typed<bigint>;
  violationCapRule: Typed<"stricter">;
  damageCapDays: Typed<bigint>;
  courtDebtCapBps: Typed<bigint>;
  loanConsentRequired: Typed<boolean>;
  schemeConsentRequired: Typed<boolean>;
  deductionCapBase: Typed<"earned-wage">;
  deductionOrder: Typed<string>;
  capRoundingMode: Typed<RoundingMode>;
  roundingMode: Typed<RoundingMode>;
}

type Slice<K extends keyof PayrollParams> = { [P in K]: PayrollParams[P] };
type Ints = "overtimeUpliftBps" | "nightOvertimeUpliftBps" |
  "overtimeMaxMinutesPerDay" | "maxHoursPer3Weeks" |
  "maxNormalHoursPerDay" | "restDayUpliftBps" | "holidayUpliftBps" |
  "dailyDivisor" | "sickFullPayDays" | "sickHalfPayDays" | "sickMaxDays" |
  "maternityFullPayDays" | "maternityHalfPayDays" |
  "maternityUnpaidExtraDays" | "deductionOverallCapBps" |
  "overpaymentCapBps" | "violationCapBps" | "violationCapDays" |
  "damageCapDays" | "courtDebtCapBps";

/** Whole-number params and their minimum values. */
const INT_MIN: Record<Ints, number> = {
  overtimeUpliftBps: 0, nightOvertimeUpliftBps: 0,
  overtimeMaxMinutesPerDay: 0, maxHoursPer3Weeks: 0,
  maxNormalHoursPerDay: 1, restDayUpliftBps: 0, holidayUpliftBps: 0,
  dailyDivisor: 1, sickFullPayDays: 0, sickHalfPayDays: 0, sickMaxDays: 0,
  maternityFullPayDays: 0, maternityHalfPayDays: 0,
  maternityUnpaidExtraDays: 0, deductionOverallCapBps: 0,
  overpaymentCapBps: 0, violationCapBps: 0, violationCapDays: 0,
  damageCapDays: 0, courtDebtCapBps: 0,
};

function loadInts(pack: RulePack, ov: Overrides): Slice<Ints> {
  const out: Partial<Slice<Ints>> = {};
  for (const key of Object.keys(INT_MIN) as Ints[]) {
    out[key] = intParam(pack, key, ov, INT_MIN[key]);
  }
  return out as Slice<Ints>;
}

function loadChoices(pack: RulePack, ov: Overrides) {
  const ch = <T extends string>(key: string, allowed: readonly T[]) =>
    choiceParam(pack, key, ov, allowed);
  return {
    nightWindow: ch("nightWindow", ["22:00-04:00"]),
    restDayPayMode: ch("restDayPayMode",
      ["extra-day-wage-plus-premium", "premium-only"]),
    restDayWageBase: ch("restDayWageBase", ["wage"]),
    prorationBasis: ch("prorationBasis", ["calendar-days"]),
    paidLeaveBase: ch("paidLeaveBase", ["wage"]),
    encashInServiceBase: ch("encashInServiceBase", ["wage"]),
    violationCapRule: ch("violationCapRule", ["stricter"]),
    deductionCapBase: ch("deductionCapBase", ["earned-wage"]),
  };
}

export function loadPayrollParams(pack: RulePack, ov: Overrides):
  PayrollParams {
  const b = (key: string) => boolParam(pack, key, ov);
  return {
    ...loadInts(pack, ov),
    ...loadChoices(pack, ov),
    shiftWorkersNightExcluded: b("shiftWorkersNightExcluded"),
    sickPaidInProbation: b("sickPaidInProbation"),
    loanConsentRequired: b("loanConsentRequired"),
    schemeConsentRequired: b("schemeConsentRequired"),
    deductionOrder: textParam(pack, "deductionOrder", ov),
    capRoundingMode: modeParam(pack, "capRoundingMode", ov),
    roundingMode: modeParam(pack, "roundingMode", ov),
  };
}

export interface GpssaParams {
  regime: GpssaRegime;
  employeeBps: Typed<bigint>;
  employerBps: Typed<bigint>;
  govSupportBps: Typed<bigint>;
  govSupportBelow: Typed<bigint> | null;
  minSalary: Typed<bigint>;
  maxSalary: Typed<bigint>;
  lastMonth: Typed<"full-month" | "none-if-partial">;
  fixingRule: Typed<"january-or-joining-month">;
  base: Typed<"basic" | "wage">;
  rounding: Typed<RoundingMode>;
}

export function loadGpssaParams(
  pack: RulePack,
  ov: Overrides,
  regime: GpssaRegime,
): GpssaParams {
  const pre = regime === "dl57-2023" ? "gpssaDl57" : "gpssaL7";
  const int = (key: string, min: number) =>
    intParam(pack, pre + key, ov, min);
  return {
    regime,
    employeeBps: int("EmployeeBps", 0),
    employerBps: int("EmployerBps", 0),
    govSupportBps: int("GovSupportBps", 0),
    govSupportBelow: regime === "dl57-2023"
      ? int("GovSupportBelowFils", 0) : null,
    minSalary: int("MinSalaryFils", 0),
    maxSalary: int("MaxSalaryFils", 0),
    lastMonth: choiceParam(pack, pre + "LastMonth", ov,
      ["full-month", "none-if-partial"]),
    fixingRule: choiceParam(pack, "gpssaFixingRule", ov,
      ["january-or-joining-month"]),
    base: choiceParam(pack, "gpssaContributionSalaryBase", ov,
      ["basic", "wage"]),
    rounding: modeParam(pack, "gpssaRoundingMode", ov),
  };
}

/** Keys of every loaded param whose value came from an override. */
export function overriddenKeys(params: object): string[] {
  const keys: string[] = [];
  for (const v of Object.values(params)) {
    const rule = (v as { rule?: { key: string; overridden: boolean } }
      | null)?.rule;
    if (rule?.overridden === true) keys.push(rule.key);
  }
  return keys;
}
