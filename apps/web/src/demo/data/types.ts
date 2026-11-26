import type { Fils } from "@payroll/engine";
import type { PeopleData } from "./people-types";
import type { TeamData } from "./team-types";

/**
 * What the screens read: a thin view over `@payroll/demo-data`, built
 * in adapter.ts (the only file that imports the package). Text for
 * people comes in both languages; while the package's Arabic is
 * missing or unreviewed the English is used and Arabic stays hidden.
 */
export interface Localized {
  en: string;
  ar: string;
}

export interface Headline {
  /** `YYYY-MM`, the month being paid. */
  runMonth: string;
  netTotalFils: Fils;
  /** Shown on the net figure itself: what it does not include. */
  netNote: Localized;
  grossTotalFils: Fils;
  deductionsFils: Fils;
  employerCostFils: Fils;
  /** What the salary file pays, and the net held out of it. */
  sifTotalFils: Fils;
  heldNetFils: Fils;
  /** People on this run's payroll and in the salary file. */
  headcount: number;
  sifPeople: number;
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

/** issue: fix before approving (counted); needs-confirmation: client
 * setup to confirm; note: context only (shown once, quietly). */
export type IssueKind = "issue" | "needs-confirmation" | "note";
export type Severity = "error" | "warning" | "info";

/** The real next step the package allows; never a one-click vanish. */
export type FixKind = "enter-iban" | "review" | "renew-document" |
  "confirm-pension";

export interface Issue {
  id: string;
  code: string;
  kind: IssueKind;
  severity: Severity;
  employeeId: string | null;
  subjectId: string | null;
  fixKind: FixKind;
  /** Short, sentence case, from the data package. */
  title: Localized;
  /** One plain sentence: no codes, raw dates or citations. */
  reason: Localized;
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

/** One state of the demo company, as the screens read it. */
export interface DemoData {
  companyName: Localized;
  /** False until a native speaker has read the package's Arabic. */
  arReviewed: boolean;
  headline(): Headline;
  departments(): DepartmentRow[];
  issues(): Issue[];
  /** Employees whose pay is held out of the salary file (no IBAN). */
  heldIds(): string[];
  /** Employees whose IBAN fails its check digits (the bank would
   * reject the payment). */
  badIbanIds(): string[];
  approvalsInbox(): Approval[];
  employee(employeeId: string): Employee;
  employees(): Employee[];
  documents(): DocumentExpiry[];
  payCalendar(): PayCalendar;
  basis(): Basis;
  runPeople(): RunPeople;
  /** People and Time off (people-types.ts). */
  people: PeopleData;
  /** Team and growth (team-types.ts). */
  team: TeamData;
}

export type IbanAttempt = { ok: true } | { ok: false; reason: Localized };

/**
 * The demo's data source. `at(ibans)` is the company after the IBANs
 * entered so far (the real salary-file check re-run each time, in the
 * package's applyIbanFix); `tryIban` says whether one more would pass.
 */
export interface DemoSource {
  at(ibans: Readonly<Record<string, string>>): DemoData;
  tryIban(ibans: Readonly<Record<string, string>>, employeeId: string,
    iban: string): IbanAttempt;
  /** The IBAN printed on the employee's (fictional) bank letter. */
  bankLetterIban(employeeId: string): string;
}
