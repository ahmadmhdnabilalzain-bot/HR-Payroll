import { Suspense, type ComponentType } from "react";
import type { ViewProps } from "../../views";
import { CompensationScreen } from "./Compensation";
import { CostBudgetScreen } from "./CostBudget";
import { ForecastScreen } from "./Forecast";
import { WorkforceScreen } from "./Workforce";
import { Loading } from "../../ui/templates";

/** Loads the planning chunk behind one quiet line, then the screen. */
const wrap = (V: ComponentType<ViewProps>): ComponentType<ViewProps> => {
  function Planning(p: ViewProps) {
    return (
      <Suspense fallback={<Loading label="Working it out…" />}>
        <V {...p} />
      </Suspense>
    );
  }
  return Planning;
};

/** Planning screens for the Reports router: HR and General manager. */
export const PLANNING_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = {
  "comp-plan": { view: wrap(CompensationScreen) },
  "workforce-plan": { view: wrap(WorkforceScreen) },
  "cost-budget": { view: wrap(CostBudgetScreen) },
  forecast: { view: wrap(ForecastScreen) },
};

export const PLANNING_BLURBS: Readonly<Record<string, string>> = {
  "people.comp-plan": "Who gets an increase in 2027, inside the " +
    "guideline and each department's pool?",
  "people.workforce-plan": "How many seats, vacancies and leavers, " +
    "against the 2027 budget?",
  "reports.cost-budget": "How does pay compare with the budget, by " +
    "department and month?",
  "reports.forecast": "What will November and December cost, against " +
    "the plan?",
};
