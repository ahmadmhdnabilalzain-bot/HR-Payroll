import type {
  CompOffBalance,
  CompOffRow,
  GrantRow,
  IncidentMonth,
  IncidentReportInput,
  IncidentView,
  Severity,
} from "@payroll/demo-data";

/**
 * The Time and safety finish screens (WP31), as they read the demo
 * company. Built in finish.ts, which only adapter.ts imports. The
 * shapes are the package's own, re-exported so screens never import it.
 */
export type {
  CompOffBalance,
  CompOffRow,
  GrantRow,
  IncidentMonth,
  IncidentReportInput,
  IncidentView,
  Severity,
};

export interface FinishData {
  compOff(): CompOffRow[];
  balances(): CompOffBalance[];
  compOffNote: string;
  /** Grants signed off before the demo. */
  grants(): GrantRow[];
  grantNote: string;
  grantPeople(): { id: string; name: string; title: string }[];
  checkGrant(employeeId: string, days: number, reason: string)
    : string | null;
  places(): { id: string; label: string }[];
  severities: readonly { value: Severity; label: string; help: string }[];
  reportNote: string;
  checkReport(i: IncidentReportInput): string | null;
  /** A report as the HR log shows it. */
  reportView(id: string, reporterId: string, on: string,
    i: IncidentReportInput): IncidentView;
  /** The monthly report with reports made in this visit counted in. */
  byMonthWith(closed: readonly string[], extra: readonly IncidentView[])
    : IncidentMonth[];
}
