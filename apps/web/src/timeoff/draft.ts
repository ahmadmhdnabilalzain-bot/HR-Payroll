import type { AnnualBalance, DayCount, LeaveTypeId }
  from "../demo/data/people-types";

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

export type DraftProblem = "errEnd" | "errNone" | "errOver";

/**
 * Why a request cannot be sent, or null. Annual leave may not go past
 * what is left; sick and unpaid leave have no balance to check.
 */
export function problemOf(type: LeaveTypeId, start: string, end: string,
  count: DayCount, balance: AnnualBalance | null): DraftProblem | null {
  if (start === "" || end === "" || end < start) return "errEnd";
  if (count.halves === 0) return "errNone";
  if (type === "lt-annual" && balance !== null &&
    count.halves > balance.availableDays * 2) return "errOver";
  return null;
}
