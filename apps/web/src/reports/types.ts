import type { Fils } from "@payroll/engine";

/**
 * What the new report screens read: plain data worked out once from
 * the package (source.ts, a lazy chunk). Money stays in fils; the
 * screens draw it. Text is English: the package has no Arabic yet.
 */

export interface MonthRow {
  /** "2026-03". */
  month: string;
  label: string;
  paid: boolean;
  headcount: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  overtimeMinutes: number;
  overtimeAmount: Fils;
  /** People who were paid overtime that month. */
  overtimePeople: number;
  annualDays: number;
  sickDays: number;
  unpaidDays: number;
}

export interface DriverRow {
  key: string;
  label: string;
  people: string[];
  amount: Fils;
}

export interface VarianceView {
  month: string;
  against: string;
  monthLabel: string;
  againstLabel: string;
  grossNow: Fils;
  grossBefore: Fils;
  grossChange: Fils;
  netChange: Fils;
  headcountChange: number;
  drivers: DriverRow[];
}

export interface AuditView {
  id: string;
  seq: number;
  when: string;
  who: string;
  area: string;
  action: string;
  summary: string;
  subject: string;
  shortHash: string;
  shortPrev: string;
}

export interface AuditCheck {
  ok: boolean;
  /** 1-based position of the first entry that does not fit. */
  brokenAt: number | null;
  checked: number;
}

export interface DeptHeads {
  name: string;
  start: number;
  joined: number;
  departed: number;
  now: number;
}

export interface OvertimeLine {
  month: string;
  name: string;
  minutes: number;
  amount: Fils;
}

export interface LeavePerson {
  name: string;
  department: string;
  annualLeft: number;
  annualTaken: number;
  sickDays: number;
  unpaidDays: number;
  waitingDays: number;
}

export interface ReportsSource {
  asOf: string;
  months: MonthRow[];
  variance(month: string, against: string): VarianceView;
  audit: AuditView[];
  verifyAudit(tamperSeq: number | null): AuditCheck;
  departments: DeptHeads[];
  joiners: string[];
  leavers: string[];
  overtime: OvertimeLine[];
  leave: LeavePerson[];
  leaveOthers: number;
  /** Annual leave left across everyone, in days. */
  annualLeftTotal: number;
}
