import { parseIsoDate } from "@payroll/engine";
import { DEMO_PERIOD } from "./calendar";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/** A date for people to read: "8 November" (year shown if not 2026). */
export function displayDate(iso: string): string {
  const d = parseIsoDate(iso);
  const base = `${d.d} ${MONTHS[d.m - 1]}`;
  return d.y === DEMO_PERIOD.year ? base : `${base} ${d.y}`;
}

/** Both forms, so the UI never has to show a raw ISO date. */
export interface DisplayDate { iso: string; display: string }

export const dateOf = (iso: string): DisplayDate =>
  ({ iso, display: displayDate(iso) });

export const possessive = (name: string): string => `${name}'s`;

/** "2 hours 30 minutes", "90 minutes" stays "1 hour 30 minutes". */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 0 ? "" : `${h} ${h === 1 ? "hour" : "hours"}`;
  const mins = m === 0 ? "" : `${m} ${m === 1 ? "minute" : "minutes"}`;
  return [hours, mins].filter((x) => x !== "").join(" ") || "0 minutes";
}

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** "8 November, in 12 days" or "6 November, 3 days ago". */
export function whenText(iso: string, daysLeft: number): string {
  const d = displayDate(iso);
  if (daysLeft === 0) return `${d}, today`;
  return daysLeft > 0 ? `${d}, in ${plural(daysLeft, "day", "days")}`
    : `${d}, ${plural(-daysLeft, "day", "days")} ago`;
}
