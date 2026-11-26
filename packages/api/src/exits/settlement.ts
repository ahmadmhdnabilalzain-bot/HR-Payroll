import type { Settlement, WorkerClass } from "@payroll/contract";
import {
  calculateSettlement,
  EngineError,
  explainTrace,
  GRATUITY_PACKS,
  type Fils,
} from "@payroll/engine";
import { toMoney } from "../db/money";

export interface ExitSettlementInput {
  joiningDate: string;
  lastWorkingDate: string;
  workerClass: WorkerClass;
  /** The stored recurring monthly basic, never a one-off or override. */
  lastBasicMonthly: Fils;
  unusedLeaveDays: number;
  serviceUnpaidLeaveDays: number;
}

/**
 * Pure: the final settlement exactly as `calculateSettlement` returns
 * it, in wire money. The engine's `notComputed` list is passed through
 * untouched. An engine refusal (GCC national, old law, bad input)
 * becomes a `refused` settlement, never an error. It takes no exit
 * kind: resignation rules are not found in Decree-Law 33 of 2021, so
 * the kind never changes the amount (Ruling 10). Nothing is deducted.
 */
export function computeExitSettlement(i: ExitSettlementInput): Settlement {
  try {
    const r = calculateSettlement({ gratuity: {
      joiningDate: i.joiningDate, lastWorkingDate: i.lastWorkingDate,
      unpaidLeaveDays: i.serviceUnpaidLeaveDays,
      lastBasicMonthly: i.lastBasicMonthly, workerClass: i.workerClass },
    unusedLeaveDays: i.unusedLeaveDays }, GRATUITY_PACKS);
    const v = r.value;
    return { status: "computed", gratuity: toMoney(v.gratuity),
      leavePay: toMoney(v.leavePay), total: toMoney(v.total),
      outcome: v.outcome, reason: v.reason, notComputed: v.notComputed,
      trace: r.trace, explanation: { en: explainTrace(r.trace, "en"),
        ar: explainTrace(r.trace, "ar"), arReviewed: false },
      includedInSif: false };
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    return { status: "refused", code: e.code, message: e.message };
  }
}
