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

/**
 * The pay-month timeline. SAMPLE dates, not legal deadlines. The
 * cut-off is a Thursday (25 October 2026 is a Sunday).
 */
export const PAY_CALENDAR = { asOf: AS_OF, cutOff: "2026-10-22",
  approveBy: "2026-10-28", salaryFileSent: "2026-10-29",
  payday: "2026-10-30", label: "sample dates" } as const;

export const LEGAL_DUE_NOTE = "Wages are due by the 1st of the next " +
  "month (WPS rule, secondary source; primary text not yet read)";

/** Settlement due this many days after the last working day. */
export const SETTLEMENT_DUE_DAYS = 14;
export const SETTLEMENT_DUE_BASIS = "our reading: Decree-Law 33/2021 " +
  "Art 53, as read in our notes";

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
