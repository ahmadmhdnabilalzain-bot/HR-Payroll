import type { Fils } from "@payroll/engine";

/**
 * The selector interface the demo codes against. It mirrors what the
 * coordinator specified for `@payroll/demo-data`; the "requested"
 * block lists what scene 1 needs beyond it (asked for, stubbed).
 * Text written for people comes in both languages; Arabic is
 * NEEDS NATIVE REVIEW.
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
  employerCostFils: Fils;
  headcount: number;
  issuesOpen: number;
  approvalsPending: number;
}

export interface DepartmentRow {
  name: Localized;
  headcount: number;
  costFils: Fils;
}

export type Severity = "error" | "warning" | "info";

/** What the person can do about an issue; drives the inline action. */
export type IssueKind = "missing-iban" | "overtime-limit" |
  "salary-change" | "unpaid-leave" | "document-expiring" |
  "pension-not-computed";

export interface Issue {
  id: string;
  employeeId: string;
  kind: IssueKind;
  severity: Severity;
  plainReason: Localized;
  suggestedFix: Localized;
}

export interface PayslipLine {
  id: string;
  label: Localized;
  amountFils: Fils;
  kind: "earning" | "deduction";
}

export interface Employee {
  id: string;
  name: Localized;
  department: Localized;
  role: Localized;
  nationality: "AE" | "other";
}

export interface Payslip {
  employee: Employee;
  lines: PayslipLine[];
  netFils: Fils;
  trace: string[];
}

export interface Explanation {
  inputs: { label: Localized; value: string }[];
  ruleId: string;
  sourceStatus: Localized;
  steps: Localized[];
  resultFils: Fils;
}

export type LeaveStatus = "pending" | "decided";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: Localized;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
}

export type ApprovalKind = "leave" | "overtime" | "expense" |
  "salary-change";

export interface Approval {
  id: string;
  kind: ApprovalKind;
  employeeId: string;
  title: Localized;
  requestedOn: string;
  amountFils: Fils | null;
}

export interface SifSummary {
  recordCount: number;
  totalFils: Fils;
  findings: { code: string; severity: Severity; text: Localized }[];
}

/* ---- Requested from the data package (stubbed until it lands) ---- */

export interface DocumentExpiry {
  id: string;
  employeeId: string;
  kind: Localized;
  expiresOn: string;
  daysLeft: number;
}

/** Dates of the pay month; shown labelled as sample dates. */
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
  engine: Localized;
}

export interface DemoData {
  companyName: Localized;
  headline(): Headline;
  departments(): DepartmentRow[];
  issues(): Issue[];
  payslip(employeeId: string): Payslip;
  explain(employeeId: string, lineId: string): Explanation;
  leaveRequests(): LeaveRequest[];
  approvalsInbox(): Approval[];
  sifSummary(): SifSummary;
  employee(employeeId: string): Employee;
  employees(): Employee[];
  documents(): DocumentExpiry[];
  payCalendar(): PayCalendar;
  basis(): Basis;
}
