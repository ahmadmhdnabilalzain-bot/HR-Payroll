import { EngineError } from "../errors";
import { intParam } from "../gratuity-params";
import { fils, mulDiv, type Fils } from "../money";
import { modeParam } from "../payroll/params";
import { DEADLINE_PACKS } from "../rules/deadlines-pack";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { Traced } from "../trace-types";

const BPS = 10000n;

function checkInputs(amountDue: Fils, daysLate: number): void {
  if (!Number.isSafeInteger(daysLate) || daysLate < 0) {
    throw new EngineError("INVALID_COUNT",
      "daysLate must be a whole number, 0 or more",
      { field: "daysLate", value: String(daysLate) });
  }
  if (amountDue < 0n) {
    throw new EngineError("INVALID_AMOUNT",
      "amountDue must not be negative",
      { field: "amountDue", value: String(amountDue) });
  }
}

/**
 * GPSSA additional amount for late payment (DL57 Art 11(4)): a daily
 * rate of the subscriptions due, capped at the cap rate of them. `on`
 * selects the pack; callers pass the deadline's last day.
 */
export function gpssaLateAddition(amountDue: Fils, daysLate: number,
  packs: readonly RulePack[] | undefined, on: string): Traced<Fils> {
  checkInputs(amountDue, daysLate);
  const pack = selectPack(packs ?? DEADLINE_PACKS, on);
  const daily = intParam(pack, "gpssaLateDailyBps", undefined, 0);
  const cap = intParam(pack, "gpssaLateCapBps", undefined, 0);
  const mode = modeParam(pack, "gpssaLateRounding", undefined);
  const byDays = mulDiv(amountDue, daily.v * BigInt(daysLate), BPS,
    mode.v);
  const capped = mulDiv(amountDue, cap.v, BPS, mode.v);
  const value = fils(byDays < capped ? byDays : capped);
  const t = new TraceBuilder();
  t.add({ id: "gpssa.late-addition", label: "GPSSA late addition",
    formula: "min(amountDue x dailyBps x daysLate / 10000, " +
      "amountDue x capBps / 10000), rounded",
    inputs: { amountDue: String(amountDue), daysLate: String(daysLate),
      on }, result: String(value),
    rules: [daily.rule, cap.rule, mode.rule] });
  return { value, trace: t.lines() };
}
