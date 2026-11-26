/**
 * The whole database surface the app uses. Both adapters return int8
 * as bigint, date as "YYYY-MM-DD" and timestamptz as ISO 8601 UTC with
 * "Z" and milliseconds.
 */
export interface Db {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  /** Runs a multi-statement script without parameters (migrations). */
  exec(sql: string): Promise<void>;
  /** Inside a transaction this runs `fn` in the same transaction. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const PG_TS = new RegExp(
  "^(\\d{4}-\\d{2}-\\d{2})[ T](\\d{2}:\\d{2}:\\d{2})" +
    "(?:\\.(\\d+))?([+-]\\d{2})(?::?(\\d{2}))?$",
);

function shiftToUtc(text: string): string {
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) throw new Error(`bad timestamp ${text}`);
  return new Date(parsed).toISOString();
}

/** PostgreSQL timestamptz text to ISO UTC with exactly 3 fractions. */
export function isoTimestamp(text: string): string {
  const m = PG_TS.exec(text);
  if (m === null) return shiftToUtc(text);
  const [, day, time, frac = "", hh = "+00", mm = "00"] = m;
  const ms = frac.padEnd(3, "0").slice(0, 3);
  if (hh === "+00" && mm === "00") return `${day}T${time}.${ms}Z`;
  return shiftToUtc(`${day}T${time}.${ms}${hh}:${mm}`);
}
