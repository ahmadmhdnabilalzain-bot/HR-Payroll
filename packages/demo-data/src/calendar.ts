import {
  addDays,
  daysInMonth,
  formatIsoDate,
  toDayNumber,
} from "@payroll/engine";

/** The pay month of the demo, and the month after it. */
export const DEMO_PERIOD = { year: 2026, month: 10 } as const;
export const NEXT_PERIOD = { year: 2026, month: 11 } as const;
/** "Today" inside the demo: the run waits for approval. */
export const AS_OF = "2026-10-27";
/** When the draft SIF was written (an input, never the clock). */
export const SIF_CREATED = { date: "2026-10-27", time: "093000" };

/** The pay-month timeline. SAMPLE dates, not a legal deadline. */
export const PAY_CALENDAR = { asOf: AS_OF, cutOff: "2026-10-25",
  approveBy: "2026-10-28", sifDue: "2026-10-29", payday: "2026-10-30",
  label: "sample dates" } as const;

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
