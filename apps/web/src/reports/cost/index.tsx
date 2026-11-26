import { Suspense, type ComponentType } from "react";
import type { ViewProps } from "../../views";
import { EmployerCostScreen } from "./Employer";
import { GratuityProvisionScreen } from "./Gratuity";
import { GratuityLiabilityScreen } from "./Liability";
import s from "./cost.module.css";

/** Loads the cost chunk behind one quiet line, then the screen. */
const wrap = (V: ComponentType): ComponentType<ViewProps> => {
  function Cost() {
    return (
      <Suspense fallback={<p className={s.loading}>Working it out…</p>}>
        <V />
      </Suspense>
    );
  }
  return Cost;
};

/** Report screens for the Reports router: HR and General manager. */
export const COST_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = {
  "gratuity-provision": { view: wrap(GratuityProvisionScreen) },
  "gratuity-liability": { view: wrap(GratuityLiabilityScreen) },
  "employer-cost": { view: wrap(EmployerCostScreen) },
};

export const COST_BLURBS: Readonly<Record<string, string>> = {
  "pay.gratuity-provision": "What would gratuity come to if each person " +
    "left today?",
  "reports.gratuity-liability": "How much gratuity is the company " +
    "carrying, by department?",
  "reports.employer-cost": "What does October cost, gross plus the " +
    "employer costs we can work out?",
};
