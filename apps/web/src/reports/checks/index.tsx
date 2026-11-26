import type { ComponentType } from "react";
import type { ViewProps } from "../../views";
import { AnomaliesScreen } from "./Anomalies";
import { TemplatesScreen } from "./Templates";

/** Check screens for the Reports router: HR and General manager. */
export const CHECKS_SCREENS: Record<string,
  { view: ComponentType<ViewProps> }> = {
  anomalies: { view: AnomaliesScreen },
  templates: { view: TemplatesScreen },
};

export const CHECKS_BLURBS: Readonly<Record<string, string>> = {
  "reports.anomalies": "Which lines on this run look different from " +
    "last month, by plain rules?",
  "reports.templates": "Ready reports to open, with the view you saved.",
};
