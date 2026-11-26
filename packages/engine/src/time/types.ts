import type { TraceLine, TraceRule } from "../trace-types";
import type { Interval } from "./intervals";

/** Minutes from midnight; `end > start`, `end - start <= 1440`. */
export interface ShiftSlot {
  start: number;
  end: number;
  breakMinutes: number;
}

export type LeavePart = "none" | "am" | "pm" | "full";

export interface DayInput {
  date: string;
  kind: "work" | "rest" | "holiday";
  shift: ShiftSlot | null;
  /**
   * Closed intervals only, minutes from 00:00 Dubai (fixed UTC+4, no
   * daylight saving); an open record sets `openRecord`. An interval
   * over 24 hours is left out and flagged `LONG_RECORD` plus
   * `MISSED_CLOCK_OUT`, never thrown.
   */
  worked: Interval[];
  openRecord: boolean;
  ramadan: boolean;
  leave: LeavePart;
}

/** Informational; a flag never blocks, cuts or deducts. */
export interface TimeFlag {
  code: string;
  dates: string[];
  detail: Record<string, string>;
  rule: TraceRule | null;
}

export interface DaySheet {
  date: string;
  kind: DayInput["kind"];
  scheduledMinutes: number;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  overtimeNightMinutes: number;
  restDayWorkMinutes: number;
  flags: TimeFlag[];
  trace: TraceLine[];
}

export interface RosterDayInput {
  date: string;
  slot: ShiftSlot | "rest" | null;
  holiday: boolean;
  companyRestDay: boolean;
  ramadan: boolean;
  onApprovedLeave: boolean;
}

/** Dates consecutive and ascending, else `INVALID_ROSTER_DAYS`. */
export interface RosterCheckInput {
  employeeId: string;
  days: RosterDayInput[];
}

/** Leave counts are whole half-days ("halves"), so no fractions. */
export type DayPart = "full" | "am" | "pm";

export interface LeaveSpan {
  start: string;
  end: string;
  startPart: DayPart;
  endPart: DayPart;
}

export type DayBasis = "calendar" | "working";

export interface LeaveCalendar {
  restDates: ReadonlySet<string>;
  holidayDates: ReadonlySet<string>;
}

export interface LeaveCount {
  halves: number;
  dates: { date: string; halves: 1 | 2; part: DayPart }[];
  skipped: { date: string; why: "rest-day" | "holiday" }[];
}

export interface LeaveAccrualPolicy {
  accrual: "upfront" | "monthly";
  annualDays: number;
  joiningYearProRata: boolean;
}

export interface BalanceInput {
  accruedHalves: number;
  carriedHalves: number;
  carriedExpiresOn: string | null;
  adjustmentHalves: number;
  taken: { date: string; halves: number }[];
  pendingHalves: number;
  asOf: string;
}

export interface BalanceResult {
  takenHalves: number;
  carriedUsedHalves: number;
  expiredHalves: number;
  availableHalves: number;
}

export type LeavePayrollKind = "annual" | "sick" | "maternity" |
  "unpaid" | "other-paid";

export interface LeavePolicyFacts {
  payrollKind: LeavePayrollKind;
  annualDays: number | null;
  accrual: LeaveAccrualPolicy["accrual"];
  dayCount: DayBasis;
  carryOverMaxDays: number | null;
}
