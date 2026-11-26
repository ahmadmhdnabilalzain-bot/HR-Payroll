/**
 * Company choices made on the rule screens during the demo. They live
 * in the one demo store (demo/state.tsx) so a role switch keeps them;
 * a reload starts the story again. A choice is recorded with who made
 * it, in which role, and on which day, and can be undone. It is the
 * company's own setting for the coming pay months: no figure already
 * in the October run changes.
 */
export interface RuleEdit {
  id: number;
  /** "ae-payroll:overtimeUpliftBps" or "policy:annualDays". */
  key: string;
  /** The number entered, in the key's own unit (%, days, hours). */
  value: number;
  /** What was changed, in words, for the change log. */
  what: string;
  who: string;
  role: string;
  /** ISO day of the demo. */
  on: string;
  undone: boolean;
}

export interface RulesSlice {
  ruleEdits: RuleEdit[];
  nextRuleEdit: number;
}

export type RulesAction =
  | { type: "rule-edit"; edit: Omit<RuleEdit, "id" | "undone"> }
  | { type: "rule-undo"; id: number };

export const RULES_INITIAL: RulesSlice = { ruleEdits: [], nextRuleEdit: 1 };

export function reduceRules<S extends RulesSlice>(s: S, a: RulesAction): S {
  switch (a.type) {
    case "rule-edit": {
      const item: RuleEdit = { ...a.edit, id: s.nextRuleEdit,
        undone: false };
      return { ...s, ruleEdits: [item, ...s.ruleEdits],
        nextRuleEdit: s.nextRuleEdit + 1 };
    }
    case "rule-undo":
      return { ...s, ruleEdits: s.ruleEdits.map((e) =>
        e.id === a.id ? { ...e, undone: true } : e) };
  }
}

/** The company's current choice for a key, or null (the rule's own). */
export function choiceOf(edits: readonly RuleEdit[], key: string)
  : RuleEdit | null {
  return edits.find((e) => e.key === key && !e.undone) ?? null;
}
