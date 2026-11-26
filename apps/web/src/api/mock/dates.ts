import { addDays, daysInMonth } from "@payroll/engine";
import type { Period } from "../contract";

const two = (n: number): string => String(n).padStart(2, "0");

export const periodStart = (p: Period): string =>
  `${p.year}-${two(p.month)}-01`;

export const periodEnd = (p: Period): string =>
  `${p.year}-${two(p.month)}-${two(daysInMonth(p.year, p.month))}`;

export function periodOf(iso: string): Period {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

export function shiftPeriod(p: Period, months: number): Period {
  const index = p.year * 12 + (p.month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** 0 is Sunday; Saturday and Sunday are the UAE weekend. */
export function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export const isWorkday = (iso: string): boolean =>
  weekday(iso) !== 0 && weekday(iso) !== 6;

/** Each date from `from` to `to`, inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** A Dubai wall-clock time on a civil date, as a UTC timestamp. */
export function dubaiAt(date: string, hh: number, mm: number): string {
  const utc = Date.UTC(Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hh - 4, mm);
  return new Date(utc).toISOString().replace(".000Z", "Z");
}

/** HHMMSS of a timestamp in Dubai (UTC+4, no daylight saving). */
export function dubaiClock(iso: string): string {
  const d = new Date(Date.parse(iso) + 4 * 3600 * 1000);
  return two(d.getUTCHours()) + two(d.getUTCMinutes()) +
    two(d.getUTCSeconds());
}

/** The Dubai civil date of a timestamp. */
export function dubaiDate(iso: string): string {
  return new Date(Date.parse(iso) + 4 * 3600 * 1000).toISOString()
    .slice(0, 10);
}

export function clampToYear(iso: string, year: number): string {
  if (iso < `${year}-01-01`) return `${year}-01-01`;
  if (iso > `${year}-12-31`) return `${year}-12-31`;
  return iso;
}
