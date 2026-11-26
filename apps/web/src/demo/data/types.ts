import type { Fils } from "@payroll/engine";

/**
 * What the screens read: a thin view over `@payroll/demo-data`, built
 * in adapter.ts (the only file that imports the package). Text for
 * people comes in both languages; the package's Arabic is NEEDS
 * NATIVE REVIEW (`arReviewed`).
 */
export interface Localized {
  en: string;
  ar: string;
}

export interface Headline {
  /** `YYYY-MM`, the month being paid. */
  runMonth: string;
  netTotalFils: Fils;
  grossTotalFils: Fils;
  deductionsFils: Fils;
  employerCostFils: Fils;
  sifTotalFils: Fils;
  heldNetFils: Fils;
  /** People on this run's payroll. */
  headcount: number;
  issuesOpen: number;
  needsConfirmation: number;
  approvalsPending: number;
}

export interface DepartmentRow {
  id: string;
  name: Localized;
  headcount: number;
  costFils: Fils;
}

export type Severity = "error" | "warning" | "info" |
  "needs-confirmation";

/** The real next step the package allows; never a one-click vanish. */
export type FixKind = "enter-iban" | "review" | "renew-document" |
  "confirm-pension";

export interface Issue {
  id: string;
  code: string;
  employeeId: string | null;
  severity: Severity;
  fixKind: FixKind;
  count: number;
  plainReason: Localized;
  suggestedFix: Localized;
}

export interface Employee {
  id: string;
  name: Localized;
  department: Localized;
  role: Localized;
}

export type ApprovalKind = "leave" | "pay-run" | "expense";

export interface Approval {
  id: string;
  kind: ApprovalKind;
  employeeId: string | null;
  title: Localized;
  requestedOn: string;
  amountFils: Fils | null;
  makerId: string;
  checkerId: string;
}

export interface DocumentExpiry {
  id: string;
  employeeId: string;
  kind: Localized;
  expiresOn: string;
  daysLeft: number;
}

/** Dates of the pay month; sample dates, labelled so on screen. */
export interface PayCalendar {
  asOf: string;
  cutOff: string;
  approveBy: string;
  sifDue: string;
  payday: string;
}

/** Where the figures come from, shown on demand next to them. */
export interface Basis {
  ruleSet: Localized;
  pension: Localized;
}

/** The maker and checker of this pay run (never the same person). */
export interface RunPeople {
  makerId: string;
  checkerId: string;
}

export interface DemoData {
  companyName: Localized;
  /** False until a native speaker has read the package's Arabic. */
  arReviewed: boolean;
  headline(): Headline;
  departments(): DepartmentRow[];
  issues(): Issue[];
  approvalsInbox(): Approval[];
  employee(employeeId: string): Employee;
  documents(): DocumentExpiry[];
  payCalendar(): PayCalendar;
  basis(): Basis;
  runPeople(): RunPeople;
}
