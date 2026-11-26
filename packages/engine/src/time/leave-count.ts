import { addDays, daysBetween, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import type {
  DayBasis,
  DayPart,
  LeaveCalendar,
  LeaveCount,
  LeaveSpan,
} from "./types";

function badPart(span: LeaveSpan, why: string): never {
  throw new EngineError("INVALID_DAY_PART", why, {
    startPart: span.startPart, endPart: span.endPart,
  });
}

/** One day: parts equal; several: start full|pm, end full|am. */
function checkParts(span: LeaveSpan, days: number): void {
  if (days === 1) {
    if (span.startPart !== span.endPart) {
      badPart(span, "a one-day leave needs the same start and end part");
    }
    return;
  }
  if (span.startPart === "am") {
    badPart(span, "a leave of several days cannot start in the morning");
  }
  if (span.endPart === "pm") {
    badPart(span, "a leave of several days cannot end in the afternoon");
  }
}

function partOn(span: LeaveSpan, i: number, days: number): DayPart {
  if (i === 0) return span.startPart;
  if (i === days - 1) return span.endPart;
  return "full";
}

function skipWhy(date: string, basis: DayBasis, cal: LeaveCalendar):
  "rest-day" | "holiday" | null {
  if (basis === "calendar") return null;
  if (cal.restDates.has(date)) return "rest-day";
  if (cal.holidayDates.has(date)) return "holiday";
  return null;
}

/**
 * Whole half-days of a leave span. `calendar` counts every date,
 * holidays included (Plan 3); `working` skips rest days, then holidays,
 * and drops a part that falls on a skipped date.
 */
export function countLeaveHalves(
  span: LeaveSpan,
  basis: DayBasis,
  cal: LeaveCalendar,
): LeaveCount {
  parseIsoDate(span.start, "start");
  parseIsoDate(span.end, "end");
  const days = daysBetween(span.start, span.end) + 1;
  if (days < 1) {
    throw new EngineError("INVALID_DATE", "end must not be before start",
      { start: span.start, end: span.end });
  }
  checkParts(span, days);
  const out: LeaveCount = { halves: 0, dates: [], skipped: [] };
  for (let i = 0; i < days; i++) {
    const date = addDays(span.start, i);
    const why = skipWhy(date, basis, cal);
    if (why !== null) {
      out.skipped.push({ date, why });
      continue;
    }
    const part = partOn(span, i, days);
    const halves = part === "full" ? 2 : 1;
    out.dates.push({ date, halves, part });
    out.halves += halves;
  }
  return out;
}
