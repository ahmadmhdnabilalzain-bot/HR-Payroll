import { addDays, parseIsoDate, toDayNumber } from "../dates";
import { EngineError } from "../errors";
import { daySheetTrace, type Fields, type Overtime } from "./day-sheet-trace";
import {
  type Interval,
  mergeIntervals,
  nightWindows,
  outside,
  overlapMinutes,
  tail,
  totalMinutes,
} from "./intervals";
import type { TimeParams } from "./params";
import type { DayInput, DaySheet, TimeFlag } from "./types";

const NONE: Overtime = { minutes: 0, night: 0, limit: null, nightPool: 0,
  rules: [], nightRules: [] };

function bad(code: string, message: string, value: string): never {
  throw new EngineError(code, message, { value });
}

function validate(day: DayInput): void {
  parseIsoDate(day.date, "date");
  const s = day.shift;
  if (s !== null && (s.end <= s.start || s.end - s.start > 1440 ||
    s.breakMinutes < 0 || s.breakMinutes > s.end - s.start)) {
    bad("INVALID_SHIFT", "shift needs end > start, at most 1440 minutes" +
      " and a break within it", `${s.start}-${s.end}/${s.breakMinutes}`);
  }
  for (const w of day.worked) {
    if (w.end <= w.start || w.start < -1440 || w.end > 2880) {
      bad("INVALID_INTERVAL", "interval needs end > start within" +
        " -1440..2880", `${w.start}-${w.end}`);
    }
  }
}

const isHalf = (day: DayInput) => day.leave === "am" || day.leave === "pm";

function scheduledOf(day: DayInput): number {
  const s = day.shift;
  if (s === null || day.kind !== "work" || day.leave === "full") return 0;
  const net = s.end - s.start - s.breakMinutes;
  return isHalf(day) ? Math.floor(net / 2) : net;
}

/** A rostered break is assumed taken (convention). */
function workedOf(day: DayInput, clocked: number): number {
  const s = day.shift;
  if (s !== null && !isHalf(day) && clocked > s.breakMinutes) {
    return clocked - s.breakMinutes;
  }
  return clocked;
}

function lateEarly(day: DayInput, merged: Interval[]): [number, number] {
  const s = day.shift;
  const first = merged[0];
  const last = merged[merged.length - 1];
  if (s === null || first === undefined || last === undefined) {
    return [0, 0];
  }
  const late = day.leave === "am" || day.leave === "full" ? 0
    : Math.max(0, first.start - s.start);
  const early = day.leave === "pm" || day.leave === "full" ? 0
    : Math.max(0, s.end - last.end);
  return [late, early];
}

function overtimeOf(day: DayInput, p: TimeParams, merged: Interval[],
  worked: number, scheduled: number): Overtime {
  if (day.kind !== "work" || day.leave === "full") return NONE;
  const nights = nightWindows(p.nightWindow.v);
  const nightRules = [p.nightWindow.rule];
  const s = day.shift;
  if (s !== null) {
    const minutes = Math.max(0, worked - scheduled);
    const out = outside(merged, { start: s.start, end: s.end });
    const nightPool = overlapMinutes(out, nights);
    const night = Math.min(minutes, nightPool);
    return { minutes, night, limit: null, nightPool, rules: [], nightRules };
  }
  const rules = [p.maxNormalMinutesPerDay.rule];
  let limit = p.maxNormalMinutesPerDay.v;
  if (day.ramadan) {
    limit -= p.ramadanReductionMinutes.v;
    rules.push(p.ramadanReductionMinutes.rule);
  }
  const minutes = Math.max(0, worked - limit);
  const night = overlapMinutes(tail(merged, minutes), nights);
  return { minutes, night, limit, nightPool: night, rules, nightRules };
}

function flagsOf(day: DayInput, p: TimeParams, worked: number,
  ot: number): TimeFlag[] {
  const flags: TimeFlag[] = [];
  const dates = [day.date];
  const restLike = day.kind !== "work";
  if (!restLike && day.leave === "full" && worked > 0) {
    flags.push({ code: "WORK_ON_LEAVE_DAY", dates,
      detail: { minutes: String(worked) }, rule: null });
  }
  if (ot > p.overtimeMaxMinutesPerDay.v) {
    flags.push({ code: "OVERTIME_DAILY_CAP_EXCEEDED", dates,
      detail: { minutes: String(ot) },
      rule: p.overtimeMaxMinutesPerDay.rule });
  }
  if (day.openRecord) {
    flags.push({ code: "MISSED_CLOCK_OUT", dates, detail: {}, rule: null });
  }
  return flags;
}

export function computeDaySheet(day: DayInput, p: TimeParams): DaySheet {
  validate(day);
  const merged = mergeIntervals(day.worked);
  const clocked = totalMinutes(merged);
  const scheduledMinutes = scheduledOf(day);
  const workedMinutes = workedOf(day, clocked);
  const [lateMinutes, earlyLeaveMinutes] = lateEarly(day, merged);
  const ot = overtimeOf(day, p, merged, workedMinutes, scheduledMinutes);
  const fields: Fields = {
    scheduledMinutes, workedMinutes, lateMinutes, earlyLeaveMinutes,
    overtimeMinutes: ot.minutes, overtimeNightMinutes: ot.night,
    restDayWorkMinutes: day.kind === "work" ? 0 : workedMinutes,
  };
  return {
    date: day.date, kind: day.kind, ...fields,
    flags: flagsOf(day, p, workedMinutes, ot.minutes),
    trace: daySheetTrace(day, fields, { clocked, merged, ot }),
  };
}

/** Worked minutes per date; a missing date counts as 0. */
function windowTotals(days: { date: string; workedMinutes: number }[]):
  { first: string; totals: number[] } | null {
  if (days.length === 0) return null;
  const nums = days.map((d) => toDayNumber(d.date));
  const lo = Math.min(...nums);
  const byDay = new Array<number>(Math.max(...nums) - lo + 1).fill(0);
  days.forEach((d, i) => { byDay[nums[i]! - lo]! += d.workedMinutes; });
  const first = days[nums.indexOf(lo)]!.date;
  const totals = byDay.slice(0, Math.max(0, byDay.length - 20))
    .map((_, s) => byDay.slice(s, s + 21).reduce((a, b) => a + b, 0));
  return { first, totals };
}

/**
 * One `HOURS_144_IN_3_WEEKS` flag per maximal run of 21-day windows
 * over the limit; dates are the first window's first date and the last
 * window's last date.
 */
export function periodHourFlags(
  days: { date: string; workedMinutes: number }[],
  p: TimeParams,
): TimeFlag[] {
  const w = windowTotals(days);
  if (w === null) return [];
  const flags: TimeFlag[] = [];
  const max = p.maxMinutesPer3Weeks.v;
  let runStart = -1;
  w.totals.forEach((total, i) => {
    const over = total > max;
    if (over && runStart < 0) runStart = i;
    const ends = runStart >= 0 && (!over || i === w.totals.length - 1);
    if (!ends) return;
    const last = over ? i : i - 1;
    const peak = Math.max(...w.totals.slice(runStart, last + 1));
    flags.push({ code: "HOURS_144_IN_3_WEEKS",
      dates: [addDays(w.first, runStart), addDays(w.first, last + 20)],
      detail: { minutes: String(peak) }, rule: p.maxMinutesPer3Weeks.rule });
    runStart = -1;
  });
  return flags;
}
