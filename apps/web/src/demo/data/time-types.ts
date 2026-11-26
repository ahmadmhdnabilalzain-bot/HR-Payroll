import type { Fils } from "@payroll/engine";

/**
 * The Time screens' view of the demo company (WP5), built in time.ts
 * (imported only by the lazy loader). Dates stay ISO for logic; the
 * screens write them out. Money stays in fils.
 */

export type DayState = "present" | "leave" | "absent-unpaid";

export interface DayRow {
  employeeId: string;
  date: string;
  state: DayState;
  /** "08:02", or null when nothing was clocked. */
  clockIn: string | null;
  clockOut: string | null;
  workedMinutes: number;
  overtimeMinutes: number;
}

export interface SheetRow {
  employeeId: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  unpaidDays: number;
  workedMinutes: number;
  overtimeMinutes: number;
  nightOvertimeMinutes: number;
  late: { date: string; minutes: number }[];
}

export interface PunchRow {
  employeeId: string;
  date: string;
  in: string | null;
  out: string | null;
  source: string;
}

export interface UnmatchedRow {
  id: string;
  badge: string;
  reader: string;
  date: string;
  time: string;
  reason: string;
}

export interface ClaimRow {
  id: string;
  employeeId: string;
  date: string;
  minutes: number;
  nightMinutes: number;
  /** "paid": in the October run. "waiting": a claim for November. */
  phase: "paid" | "waiting";
  /** What the claim adds to gross pay, from the engine. */
  value: Fils;
}

export interface CrewRequest {
  id: string;
  requestedBy: string;
  date: string;
  minutesEach: number;
  people: string[];
  estimate: Fils;
  reason: string;
}

export interface ShiftRow {
  id: string;
  label: string;
  hours: string;
  breakText: string;
}

export interface RosterCellRow {
  date: string;
  kind: "shift" | "rest" | "leave";
  shiftId: string | null;
  pending: boolean;
}

export interface RosterRow {
  employeeId: string;
  cells: RosterCellRow[];
}

export interface RosterCheck {
  employeeId: string;
  code: string;
  dates: string[];
}

export interface TimeData {
  asOf: string;
  lateGraceMinutes: number;
  /** People on the payroll on the demo's today. */
  activeToday: string[];
  days: DayRow[];
  sheets: SheetRow[];
  punches: PunchRow[];
  unmatched: UnmatchedRow[];
  claims: ClaimRow[];
  crew: CrewRequest[];
  shifts: ShiftRow[];
  rosterDays: { iso: string; status: "published" | "draft" }[];
  roster: RosterRow[];
  rosterChecks: RosterCheck[];
}

export interface TimeSource {
  data: TimeData;
}
