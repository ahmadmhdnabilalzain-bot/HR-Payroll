import type { QuietHours } from "@payroll/contract";

/** Asia/Dubai is fixed UTC+4 (no daylight saving). */
const OFFSET_MIN = 4 * 60;
const DAY_MIN = 24 * 60;

const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Pure: when a message sent at `now` may go out. Null when quiet hours
 * are off or the Dubai time of `now` is outside `[start, end)`;
 * otherwise the next instant whose Dubai time is `end` (a window may
 * cross midnight).
 */
export function quietUntil(now: Date, q: QuietHours): Date | null {
  if (!q.enabled) return null;
  const local = Math.floor(now.getTime() / 60_000) + OFFSET_MIN;
  const ofDay = ((local % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const start = minutes(q.start);
  const end = minutes(q.end);
  const inside = start < end ? ofDay >= start && ofDay < end
    : ofDay >= start || ofDay < end;
  if (!inside) return null;
  const wait = ((end - ofDay) % DAY_MIN + DAY_MIN) % DAY_MIN;
  const at = (local - OFFSET_MIN + wait) * 60_000;
  return new Date(at);
}
