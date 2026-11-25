import { EngineError } from "./errors";

/**
 * Strict ISO calendar dates (YYYY-MM-DD, proleptic Gregorian) with integer
 * day arithmetic. No JavaScript Date: day numbers use the days-from-civil
 * algorithm (H. Hinnant), day 0 being 1970-01-01.
 */
export interface CivilDate {
  y: number;
  m: number;
  d: number;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

function tryParse(text: string): CivilDate | null {
  const match = ISO.exec(text);
  if (match === null) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function isValidIsoDate(text: string): boolean {
  return tryParse(text) !== null;
}

export function parseIsoDate(text: string): CivilDate {
  const date = tryParse(text);
  if (date === null) {
    throw new EngineError(
      "INVALID_DATE",
      "date must be a real calendar date in the form YYYY-MM-DD",
      { value: text },
    );
  }
  return date;
}

export function formatIsoDate(date: CivilDate): string {
  if (date.y < 0 || date.y > 9999) {
    throw new EngineError("INVALID_DATE", "year out of range 0000-9999", {
      value: String(date.y),
    });
  }
  const y = String(date.y).padStart(4, "0");
  const m = String(date.m).padStart(2, "0");
  const d = String(date.d).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDayNumber(text: string): number {
  const { y: year, m, d } = parseIsoDate(text);
  const y = m <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(day: number): string {
  const z = day + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) -
    Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return formatIsoDate({ y, m, d });
}

export function addDays(date: string, days: number): string {
  if (!Number.isSafeInteger(days)) {
    throw new EngineError("INVALID_DAYS", "days must be a whole number", {
      value: String(days),
    });
  }
  return fromDayNumber(toDayNumber(date) + days);
}

export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** 29 February in a non-leap year becomes 28 February. */
export function anniversary(joining: string, years: number): string {
  if (!Number.isSafeInteger(years) || years < 0) {
    throw new EngineError("INVALID_YEARS", "years must be a whole number", {
      value: String(years),
    });
  }
  const { y, m, d } = parseIsoDate(joining);
  const year = y + years;
  const day = m === 2 && d === 29 && !isLeapYear(year) ? 28 : d;
  return formatIsoDate({ y: year, m, d: day });
}
