import { daysInMonth, formatIsoDate, parseIsoDate } from "../dates";
import { EngineError } from "../errors";

/**
 * The same day number `months` later, clamped to the last day of the
 * target month (2024-01-31 plus one month is 2024-02-29).
 */
export function addMonthsClamped(date: string, months: number): string {
  if (!Number.isSafeInteger(months) || months < 0) {
    throw new EngineError("INVALID_MONTHS",
      "months must be a whole number of at least 0",
      { value: String(months) });
  }
  const { y, m, d } = parseIsoDate(date);
  const index = m - 1 + months;
  const year = y + Math.floor(index / 12);
  const month = (index % 12) + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return formatIsoDate({ y: year, m: month, d: day });
}
