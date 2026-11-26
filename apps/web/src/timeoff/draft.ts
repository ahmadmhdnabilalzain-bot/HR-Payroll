import type { AnnualBalance, DayCount, LeaveTypeId }
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

export type DraftProblem = "errEnd" | "errNone" | "errOver" | "errYear" |
  "errOverlap";

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
  taken: Taken[] = []): DraftProblem | null {
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
  return null;
}
