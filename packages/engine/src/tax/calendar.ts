import {
  addDays,
  isValidIsoDate,
  parseIsoDate,
  toDayNumber,
} from "../dates";
import { EngineError } from "../errors";

/** One implementation of month arithmetic, shared with employment. */
export { addMonthsClamped } from "../employment/calendar";

const DAY_TOKENS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Day of week, 0 Sunday to 6 Saturday; 1970-01-01 was a Thursday. */
export function weekday(date: string): number {
  return (((toDayNumber(date) + 4) % 7) + 7) % 7;
}

/** "SAT,SUN" to {6, 0}; an unknown token is refused. */
export function parseWeekend(text: string): Set<number> {
  const out = new Set<number>();
  for (const token of text.split(",")) {
    const day = DAY_TOKENS.indexOf(token.trim());
    if (day < 0) {
      throw new EngineError("INVALID_PARAM",
        "weekend days must be day codes such as SAT,SUN",
        { key: "weekendDays", value: text });
    }
    out.add(day);
  }
  return out;
}

function checkCalendar(weekend: Set<number>,
  holidays: readonly string[]): Set<string> {
  if (weekend.size >= 7) {
    throw new EngineError("INVALID_PARAM",
      "at least one day of the week must be a business day",
      { key: "weekendDays", value: [...weekend].join(",") });
  }
  for (const h of holidays) {
    if (!isValidIsoDate(h)) {
      throw new EngineError("INVALID_DATE",
        "holiday must be an ISO date YYYY-MM-DD", { value: h });
    }
  }
  return new Set(holidays);
}

function isBusinessDay(date: string, weekend: Set<number>,
  holidays: Set<string>): boolean {
  return !weekend.has(weekday(date)) && !holidays.has(date);
}

/** The date itself, or the first later day that is not a weekend day
 * or a holiday. */
export function rollToBusinessDay(
  date: string,
  weekend: Set<number>,
  holidays: readonly string[],
): string {
  const off = checkCalendar(weekend, holidays);
  let day = date;
  while (!isBusinessDay(day, weekend, off)) day = addDays(day, 1);
  return day;
}

/** The n-th business day after date (n = 0 gives date itself). */
export function addBusinessDays(
  date: string,
  n: number,
  weekend: Set<number>,
  holidays: readonly string[],
): string {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new EngineError("INVALID_COUNT",
      "business days must be a whole number of at least 0",
      { value: String(n) });
  }
  const off = checkCalendar(weekend, holidays);
  parseIsoDate(date, "date");
  let day = date;
  for (let left = n; left > 0;) {
    day = addDays(day, 1);
    if (isBusinessDay(day, weekend, off)) left -= 1;
  }
  return day;
}
