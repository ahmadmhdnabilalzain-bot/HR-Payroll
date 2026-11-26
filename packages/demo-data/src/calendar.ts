import {
  addDays,
  daysInMonth,
  formatIsoDate,
  toDayNumber,
} from "@payroll/engine";

/** The finished, approved month of the demo and the next (draft). */
export const DEMO_PERIOD = { year: 2026, month: 10 } as const;
export const NEXT_PERIOD = { year: 2026, month: 11 } as const;
/** "Today" inside the demo: the last day of the finished month. */
export const AS_OF = "2026-10-31";
/** When the SIF was written (an input, never the clock). */
export const SIF_CREATED = { date: "2026-10-28", time: "093000" };

/** 0 Sunday .. 6 Saturday. Day 0 (1970-01-01) was a Thursday. */
export function weekday(date: string): number {
  return (((toDayNumber(date) + 4) % 7) + 7) % 7;
}

/** UAE private sector weekend used by the demo: Saturday, Sunday. */
export const isWorkingDay = (date: string): boolean => {
  const d = weekday(date);
  return d !== 0 && d !== 6;
};

export function monthDates(year: number, month: number): string[] {
  const first = formatIsoDate({ y: year, m: month, d: 1 });
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => addDays(first, i));
}

export function workingDaysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isWorkingDay(d)) out.push(d);
  }
  return out;
}

export const monthKey = (y: number, m: number): string =>
  `${y}-${String(m).padStart(2, "0")}`;
