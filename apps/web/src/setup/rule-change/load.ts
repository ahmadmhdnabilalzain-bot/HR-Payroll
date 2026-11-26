import { use } from "react";
import type { RuleChangeSource } from "../../demo/data/rule-change";

let pending: Promise<RuleChangeSource> | null = null;

/** The preview loads as its own chunk, once (the engine re-runs). */
export function loadRuleChange(): Promise<RuleChangeSource> {
  if (pending === null) {
    const p = import("../../demo/data/rule-change")
      .then((m) => m.buildRuleChangeSource());
    void p.then((value) => Object.assign(p, { status: "fulfilled", value }));
    pending = p;
  }
  return pending;
}

/** Suspends the first time; the index wraps it in Suspense. */
export function useRuleChange(): RuleChangeSource {
  return use(loadRuleChange());
}
