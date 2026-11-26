import type { AttendanceFlag, TimeFlagView } from "@payroll/contract";
import { addDays } from "@payroll/engine";

/** One day of facts for the pure flag rules. */
export interface FlagDay {
  date: string;
  kind: "work" | "rest" | "holiday";
  hasPublishedShift: boolean;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  worked: boolean;
  openRecord: boolean;
  leave: "none" | "half" | "full";
  sickLeave: boolean;
  restOrHolidayNext: boolean;
  restOrHolidayPrev: boolean;
  geofenceException: boolean;
  sheetFlags: TimeFlagView[];
}

/** Product thresholds, not law (company settings). */
export interface FlagThresholds { graceMinutes: number;
  lateFlagThreshold: number; restAdjacentAbsenceThreshold: number;
  shortSickSpellThreshold: number }

const LAW = new Set(["OVERTIME_DAILY_CAP_EXCEEDED", "HOURS_144_IN_3_WEEKS"]);

type Make = (code: string, dates: string[], explanation: string,
  inputs: Record<string, string>, basis: AttendanceFlag["basis"]) =>
  AttendanceFlag;

const isLate = (d: FlagDay, t: FlagThresholds) =>
  d.lateMinutes > t.graceMinutes;
const unrecorded = (d: FlagDay) => d.kind === "work" &&
  d.hasPublishedShift && !d.worked && d.leave === "none";

function dayFlags(d: FlagDay, t: FlagThresholds, mk: Make)
  : AttendanceFlag[] {
  const out: AttendanceFlag[] = [];
  const g = String(t.graceMinutes);
  if (isLate(d, t)) out.push(mk("LATE_ARRIVAL", [d.date], "Clocked in " +
    "after the shift start plus grace.", { lateMinutes:
    String(d.lateMinutes), graceMinutes: g }, "record"));
  if (d.earlyLeaveMinutes > t.graceMinutes) out.push(mk("EARLY_LEAVE",
    [d.date], "Clocked out before the shift end, beyond grace.",
    { earlyLeaveMinutes: String(d.earlyLeaveMinutes), graceMinutes: g },
    "record"));
  if (d.openRecord) out.push(mk("MISSED_CLOCK_OUT", [d.date], "A record " +
    "has no clock-out.", {}, "record"));
  if (unrecorded(d)) out.push(mk("UNRECORDED_ABSENCE", [d.date], "A " +
    "published shift with no record and no leave.", {}, "record"));
  if (d.geofenceException) out.push(mk("GEOFENCE_EXCEPTION", [d.date],
    "Clock-in outside the work site or without a location.", {},
    "record"));
  return out;
}

/** Runs of consecutive sick-leave dates. */
function sickSpells(days: FlagDay[]): string[][] {
  const sick = days.filter((d) => d.sickLeave).map((d) => d.date).sort();
  const spells: string[][] = [];
  for (const d of sick) {
    const last = spells[spells.length - 1];
    if (last && addDays(last[last.length - 1]!, 1) === d) last.push(d);
    else spells.push([d]);
  }
  return spells;
}

function patternFlags(days: FlagDay[], t: FlagThresholds, to: string,
  mk: Make): AttendanceFlag[] {
  const out: AttendanceFlag[] = [];
  const in30 = days.filter((d) => d.date > addDays(to, -30));
  const late = in30.filter((d) => isLate(d, t)).map((d) => d.date);
  if (late.length >= t.lateFlagThreshold) out.push(mk("REPEATED_LATENESS",
    late, "Late arrivals in the 30 days ending on the last date.",
    { count: String(late.length), threshold: String(t.lateFlagThreshold) },
    "product-threshold"));
  const in90 = days.filter((d) => d.date > addDays(to, -90));
  const adj = in90.filter((d) => (unrecorded(d) || d.sickLeave) &&
    (d.restOrHolidayNext || d.restOrHolidayPrev)).map((d) => d.date);
  if (adj.length >= t.restAdjacentAbsenceThreshold) out.push(mk(
    "ABSENCE_NEXT_TO_REST_DAY", adj, "Absences next to a rest day or " +
    "holiday in 90 days.", { count: String(adj.length),
    threshold: String(t.restAdjacentAbsenceThreshold) },
    "product-threshold"));
  const short = sickSpells(in90).filter((s) => s.length <= 2);
  if (short.length >= t.shortSickSpellThreshold) out.push(mk(
    "FREQUENT_SHORT_SICK_LEAVE", short.flat(), "Sick leave spells of one " +
    "or two days in 90 days.", { spells: String(short.length),
    threshold: String(t.shortSickSpellThreshold) }, "product-threshold"));
  return out;
}

/**
 * Pure. Informational flags with their dates and inputs; every flag
 * has `consequence: "none"`. Day flags fall inside the window; the
 * pattern windows end on `window.to`; law flags pass through with
 * their rule.
 */
export function computeAttendanceFlags(employeeId: string,
  days: FlagDay[], t: FlagThresholds, window: { from: string; to: string })
  : AttendanceFlag[] {
  const mk: Make = (code, dates, explanation, inputs, basis) => ({
    employeeId, code, dates, explanation, inputs, basis, rule: null,
    consequence: "none" });
  const inside = days.filter((d) => d.date >= window.from &&
    d.date <= window.to);
  const law = inside.flatMap((d) => d.sheetFlags.filter((f) =>
    LAW.has(f.code)).map((f) => ({ ...mk(f.code, f.dates, "A legal " +
    "limit was passed (informational).", f.detail, "law"),
  rule: f.rule })));
  return [...inside.flatMap((d) => dayFlags(d, t, mk)), ...law,
    ...patternFlags(days.filter((d) => d.date <= window.to), t, window.to,
      mk)];
}
