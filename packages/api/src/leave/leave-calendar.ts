import type { LeaveRequestCreate } from "@payroll/contract";
import {
  addDays,
  countLeaveHalves,
  EngineError,
  type DayBasis,
  type LeaveCalendar,
  type LeaveCount,
} from "@payroll/engine";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { isCompanyRestDay, loadCalendar } from "../time/calendar";
import { publishedSlot, readEntries } from "../time/rosters";

/**
 * Rest dates: a published rest slot, else a company rest day when the
 * date has no published slot. Holidays: the company's active ones. A
 * working basis with no company rest days and no published roster in
 * the span: 422 REST_DAYS_NOT_SET.
 */
export async function leaveCalendar(tx: Db, companyId: string,
  employeeId: string, from: string, to: string, basis: DayBasis)
  : Promise<LeaveCalendar> {
  const cal = await loadCalendar(tx, companyId, from, to);
  const slots = new Map((await readEntries(tx, companyId, [employeeId],
    from, to)).map((r) => [r.date, publishedSlot(r)]));
  const anySlot = [...slots.values()].some((s) => s !== null);
  if (basis === "working" && cal.restDays.length === 0 && !anySlot) {
    throw new ApiError("REST_DAYS_NOT_SET");
  }
  const restDates = new Set<string>();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const s = slots.get(d) ?? null;
    if (s?.kind === "rest" || (s === null && isCompanyRestDay(cal, d))) {
      restDates.add(d);
    }
  }
  return { restDates, holidayDates: new Set(cal.holidays.keys()) };
}

/** The engine's half-day count, its errors as API errors. */
export function countLeave(b: LeaveRequestCreate, basis: DayBasis,
  cal: LeaveCalendar): LeaveCount {
  try {
    return countLeaveHalves({ start: b.startDate, end: b.endDate,
      startPart: b.startPart ?? "full", endPart: b.endPart ?? "full" },
    basis, cal);
  } catch (e) {
    if (e instanceof EngineError && e.code === "INVALID_DAY_PART") {
      throw new ApiError("INVALID_DAY_PART");
    }
    throw e;
  }
}

/** Two parts on one date clash unless one is `am` and the other `pm`. */
const clash = (a: string, b: string) =>
  a === "full" || b === "full" || a === b;

/** Dates already taken (pending or approved) by a clashing part. */
export async function overlapDates(tx: Db, companyId: string,
  employeeId: string, count: LeaveCount): Promise<string[]> {
  if (count.dates.length === 0) return [];
  const rows = await tx.query<{ date: string; part: string }>(
    `SELECT d.date, d.part FROM leave_request_dates d
     JOIN leave_requests r ON r.company_id = d.company_id
       AND r.id = d.request_id
     WHERE d.company_id = $1 AND r.employee_id = $2
       AND r.status IN ('pending', 'approved')
       AND d.date = ANY($3::date[])`,
    [companyId, employeeId, count.dates.map((x) => x.date)]);
  const mine = new Map(count.dates.map((x) => [x.date, x.part]));
  return [...new Set(rows.filter((r) => clash(r.part, mine.get(r.date)!))
    .map((r) => r.date))];
}
