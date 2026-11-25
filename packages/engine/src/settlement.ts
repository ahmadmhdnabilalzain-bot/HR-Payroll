import { EngineError } from "./errors";
import { calculateGratuity, type GratuityInput } from "./gratuity";
import {
  fixedParam,
  intParam,
  roundingParam,
} from "./gratuity-params";
import { add, mulDiv, type Fils } from "./money";
import { selectPack } from "./rules/select";
import type { ParamValue, RulePack } from "./rules/types";
import { TraceBuilder } from "./trace";
import type { Traced } from "./trace-types";

export interface SettlementInput {
  gratuity: GratuityInput;
  unusedLeaveDays: number;
}

export interface SettlementResult {
  gratuity: Fils;
  leavePay: Fils;
  total: Fils;
  notComputed: string[];
}

/** No sourced rule exists for these yet; they are never guessed. */
const NOT_COMPUTED = ["notice pay", "deductions", "other dues"];

function assertLeaveDays(days: number): void {
  if (!Number.isSafeInteger(days) || days < 0) {
    throw new EngineError(
      "INVALID_LEAVE_DAYS",
      "unused leave days must be a whole number of at least 0",
      { value: String(days) },
    );
  }
}

export function calculateSettlement(
  input: SettlementInput,
  packs: RulePack[],
  overrides?: Record<string, ParamValue>,
): Traced<SettlementResult> {
  assertLeaveDays(input.unusedLeaveDays);
  const g = calculateGratuity(input.gratuity, packs, overrides);
  const pack = selectPack(packs, input.gratuity.lastWorkingDate);
  const base = fixedParam(pack, "leavePayBase", overrides, "basic");
  const divisor = intParam(pack, "dailyWageDivisor", overrides, 1);
  const mode = roundingParam(pack, overrides);
  const basic = input.gratuity.lastBasicMonthly;
  const days = BigInt(input.unusedLeaveDays);
  const leavePay = mulDiv(basic, days, divisor.v, mode.v);
  const total = add(g.value.amount, leavePay);
  const t = new TraceBuilder();
  g.trace.forEach((l) => t.add(l));
  t.add({
    id: "leave.pay", label: "Unused leave pay",
    formula: "lastBasicMonthly / dailyWageDivisor * unusedLeaveDays, " +
      "rounded once",
    inputs: { lastBasicMonthly: String(basic),
      dailyWageDivisor: String(divisor.v),
      unusedLeaveDays: String(days), leavePayBase: base.v,
      roundingMode: mode.v },
    result: String(leavePay),
    rules: [base.rule, divisor.rule, mode.rule],
  });
  t.add({
    id: "settlement.total", label: "Final settlement total",
    formula: "gratuity + leavePay",
    inputs: { gratuity: String(g.value.amount),
      leavePay: String(leavePay) },
    result: String(total), rules: [],
  });
  return {
    value: { gratuity: g.value.amount, leavePay, total,
      notComputed: [...NOT_COMPUTED] },
    trace: t.lines(),
  };
}
