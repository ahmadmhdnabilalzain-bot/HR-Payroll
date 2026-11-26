import { fils, type Fils } from "@payroll/engine";
import {
  attendanceDevices,
  AS_OF,
  buildDemoCompany,
  checklistTemplates,
  documentTypes,
  gradeBands,
  holidays,
  HOLIDAY_NOTE,
  jobCatalogue,
  kpiLibrary,
  kpiPeriods,
  letterTemplates,
  nextHoliday,
  overtimePaidStaff,
  payrollExclusions,
  renderLetterTemplate,
  reminderDates,
  signOffLevels,
  type AttendanceDevice,
  type ChecklistTemplate,
  type DocumentTypeView,
  type GradeBand,
  type HolidayView,
  type JobView,
  type KpiLibraryItem,
  type KpiPeriod,
  type LetterTemplate,
  type PayrollExclusion,
  type SignOffLevel,
} from "@payroll/demo-data";

/**
 * Everything the Setup structure screens read, worked out once from
 * the demo company. This file imports the data package, so it is only
 * reached through the lazy chunk (useStructure.ts). Nothing is typed
 * here: each list is the package's own selector.
 */
export interface DocumentSoon {
  id: string;
  who: string;
  label: string;
  expiresOn: string;
  /** Reminder dates (ISO), one per window, earliest first. */
  reminders: string[];
}

export interface PersonOption { id: string; name: string; number: string;
  salary: Fils }

export interface StructureData {
  asOf: string;
  grades: GradeBand[];
  jobs: JobView[];
  docTypes: DocumentTypeView[];
  docsSoon: DocumentSoon[];
  letters: LetterTemplate[];
  people: PersonOption[];
  checklists: ChecklistTemplate[];
  levels: SignOffLevel[];
  kpis: KpiLibraryItem[];
  periods: KpiPeriod[];
  exclusions: PayrollExclusion[];
  overtime: ReturnType<typeof overtimePaidStaff>;
  devices: AttendanceDevice[];
  holidays: HolidayView[];
  nextHoliday: HolidayView | null;
  holidayNote: string;
  render(templateId: string, employeeId: string, purpose: string,
    addressee: string): string;
}

/** The limit shows through Money, so the label drops it. */
const LIMIT_IN_LABEL = /\s+(up to|over)\s+AED\s[\d,.]+/i;

/** "not applicable: UAE nationals..." reads as a sentence. */
const tidy = (t: string): string => {
  const r = t.replace(/^not applicable:\s*/i, "");
  return r.charAt(0).toUpperCase() + r.slice(1);
};

export function buildStructureData(): StructureData {
  const c = buildDemoCompany();
  const name = new Map(c.employees.map((e) => [e.id, e.fullName]));
  const label = new Map(documentTypes(c).map((t) => [t.kind, t.label]));
  const docsSoon = c.documents
    .filter((d) => d.state !== "valid")
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
    .map((d): DocumentSoon => ({ id: d.id, who: name.get(d.employeeId)!,
      label: label.get(d.kind) ?? d.kind, expiresOn: d.expiresOn,
      reminders: reminderDates(d.expiresOn).sort() }));
  const people = c.employees.filter((e) => e.leavingDate === null)
    .map((e): PersonOption => ({ id: e.id, name: e.fullName,
      number: e.number, salary: fils(e.basicMonthly +
        e.allowances.reduce((n, a) => n + a.monthly, 0n)) }));
  return { asOf: AS_OF, grades: gradeBands(c), jobs: jobCatalogue(c),
    docTypes: documentTypes(c), docsSoon, letters: letterTemplates(c),
    people, checklists: checklistTemplates(c),
    levels: signOffLevels(c).map((l) => ({ ...l,
      label: l.label.replace(LIMIT_IN_LABEL, "") })),
    kpis: kpiLibrary(c), periods: kpiPeriods(c),
    exclusions: payrollExclusions(c).map((x) => ({ ...x,
      reason: tidy(x.reason) })), overtime: overtimePaidStaff(c),
    devices: attendanceDevices(c), holidays: holidays(c),
    nextHoliday: nextHoliday(c), holidayNote: HOLIDAY_NOTE,
    render: (t, e, p, a) => renderLetterTemplate(c, t, e, p, a) };
}

/**
 * The sample holiday list as the rules page words it. Lives here so
 * the rules chunk reads the package in one place.
 */
export function sampleHolidayText(): { count: number; names: string;
  note: string } {
  const h = holidays();
  return { count: h.length, note: HOLIDAY_NOTE,
    names: h.map((x) => `${x.name}, ${x.display.dates}`).join("; ") };
}
