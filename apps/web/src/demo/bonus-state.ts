import type { Fils } from "@payroll/engine";
import type { Role } from "./state";

/**
 * Bonus runs (an off-cycle run for a sample of people): HR prepares
 * one, reviews it and sends it, the General manager signs it off or
 * declines it. One slice in the demo store, append-only like
 * papers-state.ts: every step names who, their role and the demo's
 * date, and has an undo. A run with no step taken is a draft.
 */
export interface BonusStamp {
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface BonusDecision extends BonusStamp {
  verdict: "signed" | "declined";
}

/** The run's figures as they stood when it was prepared. */
export interface BonusSnapshot {
  count: number;
  gross: Fils;
  net: Fils;
}

export interface BonusRun {
  id: string;
  planId: string;
  label: string;
  scope: "all" | "top";
  /** People in the run, in the plan's order. */
  ids: string[];
  created: BonusStamp;
  sent: BonusStamp | null;
  decision: BonusDecision | null;
  totals: BonusSnapshot;
}

export type BonusStatus = "draft" | "waiting" | "signed" | "declined";

export const bonusStatus = (r: BonusRun): BonusStatus =>
  r.decision !== null ? r.decision.verdict
    : r.sent !== null ? "waiting" : "draft";

export interface BonusSlice {
  /** Newest first. */
  bonusRuns: BonusRun[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextBonus: number;
}

export type BonusAction =
  | { type: "bonus-new"; draft: Omit<BonusRun, "id" | "sent" | "decision"> }
  | { type: "bonus-remove"; id: string }
  | { type: "bonus-send"; id: string; stamp: BonusStamp }
  | { type: "bonus-unsend"; id: string }
  | { type: "bonus-decide"; id: string; decision: BonusDecision }
  | { type: "bonus-undecide"; id: string };

export const BONUS_INITIAL: BonusSlice = { bonusRuns: [], nextBonus: 1 };

export const bonusIdFor = (s: BonusSlice): string =>
  `bonus-run-${s.nextBonus}`;

function change<S extends BonusSlice>(s: S, id: string,
  f: (r: BonusRun) => BonusRun | null): S {
  const hit = s.bonusRuns.find((r) => r.id === id);
  if (hit === undefined) return s;
  const next = f(hit);
  if (next === null) return s;
  return { ...s, bonusRuns: s.bonusRuns.map((r) => r.id === id ? next : r) };
}

export function reduceBonus<S extends BonusSlice>(s: S, a: BonusAction): S {
  switch (a.type) {
    case "bonus-new":
      return { ...s, bonusRuns: [{ ...a.draft, id: bonusIdFor(s),
        sent: null, decision: null }, ...s.bonusRuns],
      nextBonus: s.nextBonus + 1 };
    case "bonus-remove": {
      const hit = s.bonusRuns.find((r) => r.id === a.id);
      return hit === undefined || bonusStatus(hit) !== "draft" ? s
        : { ...s, bonusRuns: s.bonusRuns.filter((r) => r.id !== a.id) };
    }
    case "bonus-send":
      return change(s, a.id, (r) => bonusStatus(r) !== "draft" ? null
        : { ...r, sent: a.stamp });
    case "bonus-unsend":
      return change(s, a.id, (r) => bonusStatus(r) !== "waiting" ? null
        : { ...r, sent: null });
    case "bonus-decide":
      return change(s, a.id, (r) => bonusStatus(r) !== "waiting" ? null
        : { ...r, decision: a.decision });
    case "bonus-undecide":
      return change(s, a.id, (r) => r.decision === null ? null
        : { ...r, decision: null });
  }
}

/** Runs for people already in a live run (not a declined one). */
export function inLiveRun(s: BonusSlice, planId: string): Set<string> {
  return new Set(s.bonusRuns.filter((r) => r.planId === planId &&
    bonusStatus(r) !== "declined").flatMap((r) => r.ids));
}
