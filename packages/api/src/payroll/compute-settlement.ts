import {
  SERVICE_UNPAID_LEAVE_NOT_ENTERED,
  type PayRunEntry,
  type TraceLine,
  type WorkerClass,
} from "@payroll/contract";
import {
  calculateSettlement,
  EngineError,
  explainTrace,
  GRATUITY_PACKS,
  type Fils,
  type GratuityOutcome,
} from "@payroll/engine";

/** Pure: a leaver's final settlement, shown on the payslip only. */
export type ComputedSettlement =
  | {
    status: "computed";
    gratuity: Fils;
    leavePay: Fils;
    total: Fils;
    outcome: GratuityOutcome;
    reason: string;
    notComputed: string[];
    trace: TraceLine[];
    explanation: { en: string; ar: string; arReviewed: false };
    includedInSif: false;
  }
  | { status: "refused"; code: string; message: string };

export interface Leaver {
  joiningDate: string;
  lastWorkingDate: string;
  workerClass: WorkerClass;
}

/**
 * Gratuity and unused leave pay through the engine. `basic` is the
 * stored recurring basic (never a run override). An engine refusal
 * (old law, GCC national, ...) becomes a "refused" settlement, not an
 * error. Not added to gross and not put in the SIF.
 */
export function settle(l: Leaver, basic: Fils, entry: PayRunEntry,
  unusedLeaveDays: number): ComputedSettlement {
  const service = entry.serviceUnpaidLeaveDays;
  try {
    const r = calculateSettlement({ gratuity: {
      joiningDate: l.joiningDate, lastWorkingDate: l.lastWorkingDate,
      unpaidLeaveDays: service ?? 0, lastBasicMonthly: basic,
      workerClass: l.workerClass }, unusedLeaveDays }, GRATUITY_PACKS);
    const v = r.value;
    return {
      status: "computed", gratuity: v.gratuity, leavePay: v.leavePay,
      total: v.total, outcome: v.outcome, reason: v.reason,
      notComputed: service === undefined
        ? [...v.notComputed, SERVICE_UNPAID_LEAVE_NOT_ENTERED]
        : [...v.notComputed],
      trace: r.trace,
      explanation: { en: explainTrace(r.trace, "en"),
        ar: explainTrace(r.trace, "ar"), arReviewed: false },
      includedInSif: false,
    };
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    return { status: "refused", code: e.code, message: e.message };
  }
}
