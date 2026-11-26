import { addDays, toDayNumber } from "../dates";
import { EngineError } from "../errors";
import type { TraceRule } from "../trace-types";
import type { TimeParams } from "./params";
import type {
  RosterCheckInput,
  RosterDayInput,
  ShiftSlot,
  TimeFlag,
} from "./types";

type Shifted = RosterDayInput & { slot: ShiftSlot };

const hasShift = (d: RosterDayInput): d is Shifted =>
  d.slot !== null && d.slot !== "rest";

const net = (s: ShiftSlot) => s.end - s.start - s.breakMinutes;

function flag(code: string, dates: string[], rule: TraceRule | null,
  detail: Record<string, string> = {}): TimeFlag {
  return { code, dates, detail, rule };
}

function assertSlot(d: RosterDayInput): void {
  if (!hasShift(d)) return;
  const s = d.slot;
  if (s.end <= s.start || s.end - s.start > 1440 || s.breakMinutes < 0 ||
    s.breakMinutes > s.end - s.start) {
    throw new EngineError("INVALID_SHIFT", "shift needs end > start, at" +
      " most 1440 minutes and a break within it",
    { date: d.date, value: `${s.start}-${s.end}/${s.breakMinutes}` });
  }
}

function assertDays(days: RosterDayInput[]): void {
  days.forEach((d, i) => {
    assertSlot(d);
    const prev = days[i - 1];
    if (prev !== undefined && d.date !== addDays(prev.date, 1)) {
      throw new EngineError("INVALID_ROSTER_DAYS",
        "roster days must be consecutive and ascending",
        { after: prev.date, value: d.date });
    }
  });
}

/** Maximal runs of items that pass `test`, in order. */
function runs<T>(xs: T[], test: (x: T) => boolean): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  for (const x of xs) {
    if (test(x)) {
      cur.push(x);
    } else if (cur.length > 0) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

/** One flag per run of seven or more days that all have shifts. */
function weeklyRest(days: RosterDayInput[], p: TimeParams): TimeFlag[] {
  return runs(days, hasShift).filter((r) => r.length >= 7)
    .map((r) => flag("NO_WEEKLY_REST", r.map((d) => d.date),
      p.minWeeklyRestDays.rule));
}

function perShift(d: Shifted, p: TimeParams): TimeFlag[] {
  const out: TimeFlag[] = [];
  const dates = [d.date];
  const n = net(d.slot);
  const limit = p.maxNormalMinutesPerDay.v -
    (d.ramadan ? p.ramadanReductionMinutes.v : 0);
  if (n > limit) {
    const rule = d.ramadan ? p.ramadanReductionMinutes.rule
      : p.maxNormalMinutesPerDay.rule;
    out.push(flag("SHIFT_OVER_NORMAL_HOURS", dates, rule,
      { netMinutes: String(n), limitMinutes: String(limit) }));
  }
  const gross = d.slot.end - d.slot.start;
  if (gross > p.maxConsecutiveWorkMinutes.v &&
    d.slot.breakMinutes < p.minRestBreakMinutes.v) {
    out.push(flag("NO_BREAK_AFTER_5_HOURS", dates,
      p.minRestBreakMinutes.rule, { grossMinutes: String(gross),
        breakMinutes: String(d.slot.breakMinutes) }));
  }
  if (d.holiday) {
    out.push(flag("HOLIDAY_SHIFT", dates, p.holidayWorkCompensated.rule));
  }
  if (d.onApprovedLeave) out.push(flag("ON_APPROVED_LEAVE", dates, null));
  return out;
}

/** ISO week (Monday start) of a date, as the Monday's day number. */
function isoWeek(date: string): number {
  const n = toDayNumber(date);
  // Day 0 (1970-01-01) was a Thursday, so Monday is (n + 3) mod 7 = 0.
  return n - (((n + 3) % 7) + 7) % 7;
}

function weekHours(days: RosterDayInput[], p: TimeParams): TimeFlag[] {
  const weeks = new Map<number, Shifted[]>();
  for (const d of days.filter(hasShift)) {
    const k = isoWeek(d.date);
    weeks.set(k, [...(weeks.get(k) ?? []), d]);
  }
  return [...weeks.values()].flatMap((ds) => {
    const total = ds.reduce((s, d) => s + net(d.slot), 0);
    if (total <= p.maxNormalMinutesPerWeek.v) return [];
    return [flag("WEEK_OVER_48_HOURS", ds.map((d) => d.date),
      p.maxNormalMinutesPerWeek.rule, { minutes: String(total) })];
  });
}

/** Runs over the sequence of company rest days, work days skipped. */
function restDaysWorked(days: RosterDayInput[], p: TimeParams):
  TimeFlag[] {
  const restDays = days.filter((d) => d.companyRestDay);
  const max = p.maxConsecutiveRestDaysWorked.v;
  return runs(restDays, hasShift).filter((r) => r.length > max)
    .map((r) => flag("CONSECUTIVE_REST_DAYS_WORKED", r.map((d) => d.date),
      p.maxConsecutiveRestDaysWorked.rule, { count: String(r.length) }));
}

/** Legal roster flags; they never block saving or publishing. */
export function checkRoster(input: RosterCheckInput, p: TimeParams):
  TimeFlag[] {
  const days = input.days;
  assertDays(days);
  return [
    ...weeklyRest(days, p),
    ...days.filter(hasShift).flatMap((d) => perShift(d, p)),
    ...weekHours(days, p),
    ...restDaysWorked(days, p),
  ];
}
