import {
  AS_OF,
  AUDITOR_MAX_NOTE,
  AUDITOR_PAGES,
  AUDITOR_STATUS_TEXT,
  REMEDY_NOTE,
  auditRows,
  auditorSample,
  auditorStatus,
  auditorWindowProblem,
  auditorWindowText,
  buildDemoCompany,
  errorRemedies,
  inspectionMonths,
  inspectionPack,
  reportDate,
  type AuditRow,
  type AuditorSample,
  type AuditorStatus,
  type ErrorRemedy,
  type InspectionMonth,
  type InspectionPack,
} from "@payroll/demo-data";

/**
 * The auditor's access, the inspection pack and the error-remedy
 * record, worked out once from the demo company. This file imports the
 * data package, so it is only reached through the lazy chunk (load.ts).
 */
export interface AuditData {
  asOfIso: string;
  asOfText: string;
  sample: AuditorSample;
  maxNote: string;
  months: InspectionMonth[];
  packs: Record<string, InspectionPack>;
  remedies: ErrorRemedy[];
  remedyNote: string;
  trail: AuditRow[];
  pages: readonly { id: string; label: string }[];
  problem(fromIso: string, toIso: string): string | null;
  status(fromIso: string, toIso: string): AuditorStatus;
  statusText: Record<AuditorStatus, string>;
  windowText(fromIso: string, toIso: string): string;
  dateText(iso: string): string;
}

export function buildAuditData(): AuditData {
  const c = buildDemoCompany();
  const months = inspectionMonths(c);
  return { asOfIso: AS_OF, asOfText: reportDate(AS_OF),
    sample: auditorSample(c), maxNote: AUDITOR_MAX_NOTE, months,
    packs: Object.fromEntries(months.map((m) =>
      [m.key, inspectionPack(c, m.key)!])),
    remedies: errorRemedies(c), remedyNote: REMEDY_NOTE,
    trail: auditRows(c), pages: AUDITOR_PAGES,
    problem: (f, t) => auditorWindowProblem(f, t),
    status: (f, t) => auditorStatus(f, t),
    statusText: AUDITOR_STATUS_TEXT, windowText: auditorWindowText,
    dateText: reportDate };
}
