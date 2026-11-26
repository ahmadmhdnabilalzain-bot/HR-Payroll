import type { Fils } from "@payroll/engine";
import type { Role } from "./state";

/**
 * The 2027 pay plan (compensation planning): increases HR proposes
 * and the General manager signs off as one batch. One slice in the
 * demo store, append-only like papers-state.ts: every step names who,
 * their role and the demo's date, and has an undo.
 */
export interface PlanProposal {
  /** Pay-scale steps proposed; always within the guideline and pool. */
  steps: number;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

/** One person's increase as it stood when the batch was signed off. */
export interface PlanItem {
  employeeId: string;
  name: string;
  departmentId: string;
  departmentText: string;
  steps: number;
  from: Fils;
  to: Fils;
  /** Display text of the day it takes effect. */
  effective: string;
}

export interface PlanBatch {
  id: string;
  items: PlanItem[];
  by: string;
  role: Role;
  on: string;
}

export interface PlanningSlice {
  /** Employee id to the latest proposal (absent: none). */
  planProposals: Record<string, PlanProposal>;
  /** Signed-off batches, newest first. */
  planBatches: PlanBatch[];
  nextPlan: number;
}

export type PlanningAction =
  | { type: "plan-set"; employeeId: string; proposal: PlanProposal | null }
  | { type: "plan-signoff"; items: PlanItem[]; by: string; role: Role;
    on: string }
  | { type: "plan-unsign"; id: string };

export const PLANNING_INITIAL: PlanningSlice = { planProposals: {},
  planBatches: [], nextPlan: 1 };

export function reducePlanning<S extends PlanningSlice>(s: S,
  a: PlanningAction): S {
  switch (a.type) {
    case "plan-set": {
      const { [a.employeeId]: _gone, ...rest } = s.planProposals;
      return { ...s, planProposals: a.proposal === null ? rest
        : { ...rest, [a.employeeId]: a.proposal } };
    }
    case "plan-signoff":
      return { ...s, planBatches: [{ id: `plan-batch-${s.nextPlan}`,
        items: a.items, by: a.by, role: a.role, on: a.on },
      ...s.planBatches], nextPlan: s.nextPlan + 1 };
    case "plan-unsign":
      return { ...s, planBatches: s.planBatches.filter((b) =>
        b.id !== a.id) };
  }
}

/** Employee ids already signed off, in any batch. */
export const signedOffIds = (s: PlanningSlice): Set<string> =>
  new Set(s.planBatches.flatMap((b) => b.items.map((i) => i.employeeId)));
