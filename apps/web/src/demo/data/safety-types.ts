import type {
  AckRow,
  CoverRow,
  IloeRow,
  IncidentAction,
  IncidentMonth,
  IncidentView,
  PolicyView,
} from "@payroll/demo-data";

/**
 * Safety and cover (WP15): health insurance, incidents, ILOE and
 * policies, as the screens read them. Built in safety.ts, which only
 * adapter.ts imports. The shapes are the package's own, re-exported so
 * screens never import the package.
 */
export type {
  AckRow,
  CoverRow,
  IloeRow,
  IncidentAction,
  IncidentMonth,
  IncidentView,
  PolicyView,
};

export interface SafetyData {
  cover(): CoverRow[];
  insurer: string;
  insuranceBasis: string;
  incidents(): IncidentView[];
  /** Incidents by month; `closed` are ids closed in this visit. */
  byMonth(closed: readonly string[]): IncidentMonth[];
  iloe(): IloeRow[];
  iloeBasis: string;
  iloeExemptNote: string;
  policies(): PolicyView[];
  /** The demo day, ISO: the date a mark is recorded on. */
  asOf: string;
}
