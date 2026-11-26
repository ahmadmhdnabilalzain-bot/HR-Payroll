import type { Role } from "./state";

/**
 * Referral and agency ledger (P22): the rows marked payable. A mark
 * is a draft for the next run: it feeds nothing in the real pay run.
 * One slice in the demo store, append-only like papers-state.ts: each
 * mark names who, their role and the demo's date, and has an undo.
 */
export interface ReferralMark {
  /** The ledger row id ("ref-emp-007"). */
  rowId: string;
  /** Who it is for, and the kind, for the audit line. */
  label: string;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface ReferralSlice {
  referralMarks: ReferralMark[];
}

export type ReferralAction =
  | { type: "ref-mark"; mark: ReferralMark }
  | { type: "ref-unmark"; rowId: string; label: string };

export const REFERRAL_INITIAL: ReferralSlice = { referralMarks: [] };

export function reduceReferral<S extends ReferralSlice>(s: S,
  a: ReferralAction): S {
  switch (a.type) {
    case "ref-mark":
      return s.referralMarks.some((m) => m.rowId === a.mark.rowId) ? s
        : { ...s, referralMarks: [...s.referralMarks, a.mark] };
    case "ref-unmark":
      return { ...s, referralMarks: s.referralMarks.filter((m) =>
        m.rowId !== a.rowId) };
  }
}

/** Ids of the rows marked payable. */
export const markedIds = (s: ReferralSlice): Set<string> =>
  new Set(s.referralMarks.map((m) => m.rowId));
