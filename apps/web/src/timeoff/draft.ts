import type { AnnualBalance, DayCount, LeaveRuleView, LeaveTypeId }
  from "../demo/data/people-types";

/** The leave year of the demo's balances. */
export const YEAR = 2026;

/** The week after the demo's today, Monday to Friday (a fair default). */
export function nextWeek(asOf: string): { start: string; end: string } {
  const [y, m, d] = asOf.split("-").map(Number);
  const at = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  const toMonday = ((8 - at.getUTCDay()) % 7) || 7;
  const iso = (x: Date): string => x.toISOString().slice(0, 10);
  const mon = new Date(at.getTime() + toMonday * 86400000);
  const fri = new Date(mon.getTime() + 4 * 86400000);
  return { start: iso(mon), end: iso(fri) };
}

/** A civil date `days` after `iso` (no clock, no zone). */
export function plusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days))
    .toISOString().slice(0, 10);
}

/** Calendar days from `start` to `end`, both counted. */
export function calendarDays(start: string, end: string): number {
  const at = (x: string): number => Date.parse(`${x}T00:00:00Z`);
  return Math.round((at(end) - at(start)) / 86400000) + 1;
}

/** Whole years from `from` to `to` (civil dates). */
export function yearsBetween(from: string, to: string): number {
  const [fy = 0, fm = 0, fd = 0] = from.split("-").map(Number);
  const [ty = 0, tm = 0, td = 0] = to.split("-").map(Number);
  return ty - fy - (tm < fm || (tm === fm && td < fd) ? 1 : 0);
}

export type DraftProblem = "errEnd" | "errNone" | "errOver" | "errYear" |
  "errOverlap" | "errMax" | "errService" | "errProof";

/** What a type's rule checks besides the dates (all optional). */
export interface RuleCheck {
  rule: LeaveRuleView;
  /** Whole years the person has been with the company. */
  serviceYears: number;
  /** True once the proof the rule asks for is attached. */
  proofAdded: boolean;
}

/** The days a request takes, on its rule's basis. */
export function daysOf(rule: LeaveRuleView, start: string, end: string,
  count: DayCount): number {
  return rule.basis === "calendar" ? calendarDays(start, end)
    : count.halves / 2;
}

/** A request of this person's that still counts (booked or waiting). */
export interface Taken { startDate: string; endDate: string }

/**
 * Why a request cannot be sent, or null. Dates stay in the balance
 * year; a request may not overlap one already booked or waiting;
 * annual leave may not go past what is left (sick and unpaid leave
 * have no balance to check).
 */
export function problemOf(type: LeaveTypeId, start: string, end: string,
  count: DayCount, balance: AnnualBalance | null,
  taken: Taken[] = [], check?: RuleCheck): DraftProblem | null {
  if (start === "" || end === "" || end < start) return "errEnd";
  if (!start.startsWith(String(YEAR)) || !end.startsWith(String(YEAR))) {
    return "errYear";
  }
  if (taken.some((x) => x.startDate <= end && start <= x.endDate)) {
    return "errOverlap";
  }
  if (count.halves === 0) return "errNone";
  if (type === "lt-annual" && balance !== null &&
    count.halves > balance.availableDays * 2) return "errOver";
  if (check === undefined) return null;
  const r = check.rule;
  if (check.serviceYears < r.minServiceYears) return "errService";
  if (r.maxDays !== null && daysOf(r, start, end, count) > r.maxDays) {
    return "errMax";
  }
  if (r.proof !== null && !check.proofAdded) return "errProof";
  return null;
}
