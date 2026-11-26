import type { Role } from "../../demo/state";

/**
 * Decisions on a pending rule change (WP28, S09). One slice in the demo
 * store, like papers-state.ts: HR decides first, then the General
 * manager; each step names who, their role and the demo's date. Undo
 * removes the latest step only. Planning a change never moves a
 * figure of the October run: it says what the next run would do.
 */
export type RuleChangeVerdict = "plan" | "hold";

export interface RuleChangeStep {
  changeId: string;
  verdict: RuleChangeVerdict;
  /** The acting person's name and job title. */
  who: string;
  title: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface RuleChangeSlice {
  ruleChangeSteps: RuleChangeStep[];
}

export type RuleChangeAction =
  | { type: "rule-change-step"; step: RuleChangeStep }
  | { type: "rule-change-undo"; changeId: string };

export const RULE_CHANGE_INITIAL: RuleChangeSlice = { ruleChangeSteps: [] };

export function reduceRuleChange<S extends RuleChangeSlice>(s: S,
  a: RuleChangeAction): S {
  switch (a.type) {
    case "rule-change-step":
      return { ...s, ruleChangeSteps: [...s.ruleChangeSteps, a.step] };
    case "rule-change-undo": {
      const i = s.ruleChangeSteps.map((x) => x.changeId)
        .lastIndexOf(a.changeId);
      return i < 0 ? s : { ...s, ruleChangeSteps:
        s.ruleChangeSteps.filter((_, j) => j !== i) };
    }
  }
}

/** Where a change stands, from its steps. */
export type RuleChangeStage =
  | { kind: "waiting-hr" }
  | { kind: "waiting-gm"; hr: RuleChangeStep }
  | { kind: "held"; by: RuleChangeStep; hr: RuleChangeStep | null }
  | { kind: "planned"; hr: RuleChangeStep; gm: RuleChangeStep };

export function stageOf(steps: readonly RuleChangeStep[], changeId: string)
  : RuleChangeStage {
  const mine = steps.filter((x) => x.changeId === changeId);
  const hr = mine[0];
  if (hr === undefined) return { kind: "waiting-hr" };
  if (hr.verdict === "hold") return { kind: "held", by: hr, hr: null };
  const gm = mine[1];
  if (gm === undefined) return { kind: "waiting-gm", hr };
  return gm.verdict === "hold" ? { kind: "held", by: gm, hr }
    : { kind: "planned", hr, gm };
}

/** Waiting for this role: 1 or 0 (the panel's count). */
export function ruleChangeWaiting(steps: readonly RuleChangeStep[],
  changeId: string, role: Role): number {
  const st = stageOf(steps, changeId).kind;
  return (st === "waiting-hr" && role === "hr") ||
    (st === "waiting-gm" && role === "gm") ? 1 : 0;
}

/** The one pending change in the demo data (ruleChange().id), so the
 * panel count reads without loading the engine chunk. */
export const RULE_CHANGE_ID = "rc-2026-11-overtime";
