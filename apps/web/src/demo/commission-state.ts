import type { Fils } from "@payroll/engine";
import type { Role } from "./state";

/**
 * Sales commission statements, a month at a time: HR prepares the
 * month's statements, the General manager signs them off or declines
 * them as one batch. One slice in the demo store, append-only like
 * papers-state.ts: every step names who, their role and the demo's
 * date, and has an undo. A month with no step is not yet prepared.
 */
export interface CommissionStamp {
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface CommissionDecision extends CommissionStamp {
  verdict: "signed" | "declined";
}

/** The month's figures as they stood when HR prepared it. */
export interface CommissionSnapshot {
  count: number;
  commission: Fils;
  net: Fils;
}

export interface CommissionMonth {
  prepared: CommissionStamp;
  decision: CommissionDecision | null;
  totals: CommissionSnapshot;
}

export type CommissionStatus = "open" | "waiting" | "signed" | "declined";

export const commissionStatus = (m: CommissionMonth | undefined)
  : CommissionStatus => m === undefined ? "open"
  : m.decision !== null ? m.decision.verdict : "waiting";

export interface CommissionSlice {
  /** Month key ("2026-10") to its batch. */
  commissionMonths: Record<string, CommissionMonth>;
}

export type CommissionAction =
  | { type: "commission-prepare"; month: string; prepared: CommissionStamp;
    totals: CommissionSnapshot }
  | { type: "commission-unprepare"; month: string }
  | { type: "commission-decide"; month: string;
    decision: CommissionDecision }
  | { type: "commission-undecide"; month: string };

export const COMMISSION_INITIAL: CommissionSlice = { commissionMonths: {} };

export function reduceCommission<S extends CommissionSlice>(s: S,
  a: CommissionAction): S {
  const at = s.commissionMonths[a.month];
  switch (a.type) {
    case "commission-prepare":
      return at !== undefined && at.decision?.verdict !== "declined" ? s
        : { ...s, commissionMonths: {
        ...s.commissionMonths, [a.month]: { prepared: a.prepared,
          decision: null, totals: a.totals } } };
    case "commission-unprepare": {
      if (at === undefined || at.decision !== null) return s;
      const { [a.month]: _gone, ...rest } = s.commissionMonths;
      return { ...s, commissionMonths: rest };
    }
    case "commission-decide":
      return at === undefined || at.decision !== null ? s
        : { ...s, commissionMonths: { ...s.commissionMonths,
          [a.month]: { ...at, decision: a.decision } } };
    case "commission-undecide":
      return at === undefined || at.decision === null ? s
        : { ...s, commissionMonths: { ...s.commissionMonths,
          [a.month]: { ...at, decision: null } } };
  }
}
