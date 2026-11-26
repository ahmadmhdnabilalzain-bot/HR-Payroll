import type { Period } from "@payroll/contract";
import { daysBetween, daysInMonth } from "@payroll/engine";

/**
 * Leave days are calendar days, start and end included. Weekends and
 * public holidays are not modelled (labelled "calendar-days-inclusive"
 * on every balance).
 */
export function leaveDays(start: string, end: string): number {
  return daysBetween(start, end) + 1;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function periodBounds(p: Period): { first: string; last: string } {
  const ym = `${p.year}-${pad(p.month)}`;
  return { first: `${ym}-01`,
    last: `${ym}-${pad(daysInMonth(p.year, p.month))}` };
}

/** The days of [start, end] that fall inside the month. */
export function daysInPeriod(start: string, end: string, p: Period)
  : number {
  const { first, last } = periodBounds(p);
  const from = start > first ? start : first;
  const to = end < last ? end : last;
  return to < from ? 0 : leaveDays(from, to);
}
