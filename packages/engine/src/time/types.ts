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
  /** Closed intervals only; an open record sets `openRecord`. */
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
