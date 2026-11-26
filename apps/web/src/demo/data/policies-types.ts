import type {
  Policy,
  PolicyAnswer,
  PolicyHit,
  PolicySection,
} from "@payroll/demo-data";

/**
 * The policy library (H15), as the screens read it. Built in
 * policies.ts, which only adapter.ts imports. Package shapes are
 * re-exported as types so screens never import the package.
 */
export type { Policy, PolicyAnswer, PolicyHit, PolicySection };

export interface PoliciesData {
  asOf: string;
  note: string;
  notCovered: string;
  library(): Policy[];
  byId(id: string): Policy | null;
  /** Match a question to the sections: rule-based, no model. */
  ask(question: string): PolicyAnswer;
}
