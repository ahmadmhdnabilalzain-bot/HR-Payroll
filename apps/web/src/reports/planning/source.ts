import {
  buildDemoCompany,
  costBudget,
  meritPlan,
  workforcePlan,
  type CostBudget,
  type MeritPlan,
  type WorkforcePlan,
} from "@payroll/demo-data";

/**
 * The planning screens' data (a lazy chunk, beside the cost reports'):
 * the merit guideline, the workforce plan and the 2026 budget against
 * actual with its forecast. Every figure comes from the package's
 * selectors, which run the engine; nothing is typed here.
 */
export interface PlanningSource {
  merit: MeritPlan;
  workforce: WorkforcePlan;
  budget: CostBudget;
}

export function buildPlanningSource(): PlanningSource {
  const c = buildDemoCompany();
  return { merit: meritPlan(c), workforce: workforcePlan(c),
    budget: costBudget(c) };
}

export type { BudgetRow, MeritRow } from "@payroll/demo-data";
