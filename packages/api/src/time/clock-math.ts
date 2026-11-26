import { MAX_RECORD_MS } from "@payroll/contract";
import type { Interval } from "@payroll/engine";

/**
 * Whole minutes from 00:00 Dubai (UTC+4, no daylight saving) of
 * `date` to `ts`, floored. Parses the given strings only.
 */
export function minutesFromDubaiMidnight(ts: string, date: string): number {
  return Math.floor((Date.parse(ts) - Date.parse(`${date}T00:00:00+04:00`))
    / 60_000);
}

export interface RecordTimes { clock_in: string; clock_out: string | null }

export type RecordShape =
  | { kind: "closed"; interval: Interval }
  | { kind: "open" }
  | { kind: "empty" };

/** The engine's interval bounds (minutes from the sheet's midnight). */
const LO = -1440;
const HI = 2880;

/**
 * A record as worked minutes of its date. Open records, and records
 * longer than 24 hours (odd data, never worked time), are "open": the
 * day shows a missed clock-out, never overtime. A record shorter than
 * a minute is "empty". Bounds are clamped so the engine never throws.
 */
export function recordShape(r: RecordTimes, date: string): RecordShape {
  if (r.clock_out === null) return { kind: "open" };
  const ms = Date.parse(r.clock_out) - Date.parse(r.clock_in);
  if (!(ms >= 0) || ms > MAX_RECORD_MS) return { kind: "open" };
  const start = Math.max(LO, minutesFromDubaiMidnight(r.clock_in, date));
  const end = Math.min(HI, minutesFromDubaiMidnight(r.clock_out, date));
  if (end <= start) return { kind: "empty" };
  return { kind: "closed", interval: { start, end } };
}

/** The closed interval of a record, else null (plan's name). */
export function recordToInterval(r: RecordTimes, date: string)
  : Interval | null {
  const s = recordShape(r, date);
  return s.kind === "closed" ? s.interval : null;
}
