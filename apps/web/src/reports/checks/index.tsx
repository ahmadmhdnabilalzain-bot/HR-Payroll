import type { ComponentType } from "react";
import type { ViewProps } from "../../views";
import { AnomaliesScreen } from "./Anomalies";
import { CostOfHireScreen } from "./CostOfHire";
import { TemplatesScreen } from "./Templates";

/** Check screens for the Reports router: HR and General manager. */
export const CHECKS_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = {
  anomalies: { view: AnomaliesScreen },
  "cost-of-hire": { view: CostOfHireScreen },
  templates: { view: TemplatesScreen },
};

export const CHECKS_BLURBS: Readonly<Record<string, string>> = {
  "reports.anomalies": "Which lines on this run look different from " +
    "last month, by plain rules?",
  "reports.templates": "Ready reports to open, with the view you saved.",
  "people.cost-of-hire": "What does a planned hire cost in the first " +
    "year, against the department budget?",
};
