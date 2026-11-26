import type {
  AnomalyFinding,
  AnomalyReport,
  AnomalyRule,
  HirePreview,
  HireRole,
  ReportTemplate,
  TemplateChoices,
} from "@payroll/demo-data";

/**
 * Checks (R43, P20, X12) as the screens read them. Built in checks.ts,
 * which only adapter.ts imports. The shapes are the package's own,
 * re-exported so screens never import the package.
 */
export type {
  AnomalyFinding,
  AnomalyReport,
  AnomalyRule,
  HirePreview,
  HireRole,
  ReportTemplate,
  TemplateChoices,
};

export interface HireEntry { jobKey: string; grade: number;
  startIso: string; national: boolean }

export interface ChecksData {
  /** Rule-based findings; `bankSaved`: people whose account was saved. */
  anomalies(bankSaved: readonly string[]): AnomalyReport;
  hireRoles(): HireRole[];
  hire(entry: HireEntry): HirePreview;
  templates: readonly ReportTemplate[];
  templateChoices(): TemplateChoices;
  /** The saved view's name for a template and the filter's words. */
  viewName(t: ReportTemplate, filterText: string): string;
  /** The demo day, ISO, to default a start date after it. */
  asOf: string;
}
