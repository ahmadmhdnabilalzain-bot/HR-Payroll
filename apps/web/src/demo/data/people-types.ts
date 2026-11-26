import type { Fils } from "@payroll/engine";
import type { Explanation } from "../../components/explain/types";
import type { Localized } from "./types";

/**
 * The People and Time off screens' view of the demo company, built in
 * people.ts (imported only by the adapter). Dates come as ISO for
 * logic; the screens format them, never print them raw.
 */

/** Where a person stands today; one word on screen, with a colour. */
export type PersonStatus = "active" | "probation" | "left" | "joining";

export interface Person {
  id: string;
  /** The staff number, "ZDB-0017". */
  number: string;
  name: Localized;
  role: Localized;
  departmentId: string;
  department: Localized;
  branch: Localized;
  status: PersonStatus;
  /** ISO, the day the status is about (probation end, last day). */
  statusDate: string | null;
  joinedOn: string;
  leftOn: string | null;
  probationEndsOn: string | null;
  grade: number;
  /** ISO 3166 code; the screens name it with Intl.DisplayNames. */
  nationality: string;
  uaeNational: boolean;
  email: string;
  /** Masked and fake (fails Luhn); never the full value. */
  emiratesIdMasked: string;
  /** Masked IBAN, or null when none is on file. */
  ibanMasked: string | null;
  /** Who decides this person's requests (never the person). */
  approverId: string;
}

export interface DepartmentOption {
  id: string;
  name: Localized;
}

export type LineGroup = "earning" | "deduction";

export interface PayslipLineView {
  traceId: string;
  group: LineGroup;
  /** The engine's own words, e.g. "Allowance housing". */
  engineLabel: string;
  /** The engine's line kind, e.g. "housing"; the code for "other". */
  kind: string;
  code: string | null;
  amountFils: Fils;
}

/** A national's pension: not computed, with the agreed wording. */
export interface PensionNotComputed {
  status: "not-computed";
  traceId: string;
  text: Localized;
}

export interface PayslipView {
  id: string;
  employeeId: string;
  /** `YYYY-MM`. */
  month: string;
  payStart: string;
  payEnd: string;
  daysInPeriod: number;
  unpaidDays: number;
  lines: PayslipLineView[];
  grossFils: Fils;
  deductionsFils: Fils;
  netFils: Fils;
  grossTraceId: string;
  deductionsTraceId: string;
  netTraceId: string;
  pension: PensionNotComputed | null;
  /** Held out of the salary file, with the package's reason. */
  held: string | null;
  rulesScope: Localized;
}

export interface DocumentView {
  id: string;
  employeeId: string;
  kind: Localized;
  numberMasked: string;
  expiresOn: string;
  daysLeft: number;
  state: "expired" | "expiring-30" | "expiring-90" | "valid";
}

export type LeaveTypeId = "lt-annual" | "lt-sick" | "lt-unpaid";
export type LeaveStatus = "approved" | "pending" | "rejected";

export interface LeaveTypeView {
  id: LeaveTypeId;
  name: Localized;
  paid: boolean;
  annualDays: number | null;
}

export interface ReasonOption {
  key: string;
  text: Localized;
}

/** A request from the package (its status may be changed in session). */
export interface LeaveRequestView {
  id: string;
  employeeId: string;
  leaveTypeId: LeaveTypeId;
  startDate: string;
  endDate: string;
  halves: number;
  status: LeaveStatus;
  reason: Localized;
  /** The approval that decides it, when it is still waiting. */
  approvalId: string | null;
  approverId: string;
}

/** What a balance is computed from (the engine re-runs on it). */
export interface LeaveUse {
  employeeId: string;
  leaveTypeId: LeaveTypeId;
  startDate: string;
  halves: number;
  state: "taken" | "pending";
}

export interface AnnualBalance {
  employeeId: string;
  year: number;
  accruedHalves: number;
  takenHalves: number;
  pendingHalves: number;
  /** What the screens show; at exit the settlement's own figure. */
  availableDays: number;
  /** How a leaver's days are counted (the package's words), or null. */
  basis: string | null;
}

export interface DayCount {
  /** Whole half-days, from the engine's countLeaveHalves. */
  halves: number;
  /** Weekend days inside the span, not counted. */
  weekendDays: number;
}

/** The people the role switcher stands for, from the data. */
export interface Personas {
  hrId: string;
  gmId: string;
  managerId: string;
  employeeId: string;
}

export interface PeopleData {
  asOf: string;
  personas(): Personas;
  people(): Person[];
  person(id: string): Person | null;
  departments(): DepartmentOption[];
  payslip(employeeId: string): PayslipView | null;
  /** One payslip figure for the shared explain panel. */
  explain(payslipId: string, traceId: string, label: string,
    lang: "en" | "ar"): Explanation;
  documentsOf(employeeId: string): DocumentView[];
  leaveTypes(): LeaveTypeView[];
  reasons(): ReasonOption[];
  leaveRequests(): LeaveRequestView[];
  /** The approval title for a new leave request ("Leave request"). */
  leaveApprovalTitle: Localized;
  /** Annual leave from the engine for these uses, null if not joined. */
  annualBalance(employeeId: string, uses: LeaveUse[]): AnnualBalance | null;
  /** Working days of a span (weekends skipped) via the engine. */
  countDays(startDate: string, endDate: string): DayCount;
  /** Who decides a request by this person; never the person. */
  approverOf(employeeId: string): string;
}
