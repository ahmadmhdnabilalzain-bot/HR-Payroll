import {
  addDays,
  anniversary,
  daysBetween,
  parseIsoDate,
  type LeapDayRule,
  toDayNumber,
} from "./dates";
import { EngineError } from "./errors";

/** Length of service, counted by calendar anniversary. */
export interface ServiceLength {
  /** Calendar days from joining to the exclusive end, before unpaid. */
  totalDays: number;
  /** Exclusive end after moving back by the excluded unpaid days. */
  exclusiveEnd: string;
  /** Days of service counted, after unpaid days. */
  serviceDays: number;
  completedYears: number;
  lastAnniversary: string;
  leftoverDays: number;
}

export interface ServiceRules {
  endDateInclusive: boolean;
  unpaidDaysExcluded: boolean;
  leapDayAnniversary: LeapDayRule;
}

export function assertDateRange(joining: string, last: string): void {
  parseIsoDate(joining, "joiningDate");
  parseIsoDate(last, "lastWorkingDate");
  if (last < joining) {
    throw new EngineError(
      "INVALID_DATE_RANGE",
      "last working date is before the joining date",
      { joiningDate: joining, lastWorkingDate: last },
    );
  }
}

export function assertUnpaidDays(unpaid: number, totalDays: number): void {
  const ok = Number.isSafeInteger(unpaid) && unpaid >= 0 &&
    unpaid <= totalDays;
  if (!ok) {
    throw new EngineError(
      "INVALID_UNPAID_DAYS",
      "unpaid leave days must be a whole number from 0 to the total days",
      { value: String(unpaid), totalDays: String(totalDays) },
    );
  }
}

/** Most whole anniversaries of joining that are not after end. */
function completedYearsTo(
  joining: string,
  end: string,
  rule: LeapDayRule,
): number {
  const endDay = toDayNumber(end);
  let years = parseIsoDate(end).y - parseIsoDate(joining).y;
  const after = (n: number) =>
    toDayNumber(anniversary(joining, n, rule)) > endDay;
  while (years > 0 && after(years)) years -= 1;
  return years;
}

export function measureService(
  joining: string,
  last: string,
  unpaidDays: number,
  rules: ServiceRules,
): ServiceLength {
  assertDateRange(joining, last);
  const rawEnd = rules.endDateInclusive ? addDays(last, 1) : last;
  const totalDays = daysBetween(joining, rawEnd);
  assertUnpaidDays(unpaidDays, totalDays);
  const excluded = rules.unpaidDaysExcluded ? unpaidDays : 0;
  const exclusiveEnd = addDays(rawEnd, -excluded);
  const rule = rules.leapDayAnniversary;
  const completedYears = completedYearsTo(joining, exclusiveEnd, rule);
  const lastAnniversary = anniversary(joining, completedYears, rule);
  return {
    totalDays,
    exclusiveEnd,
    serviceDays: daysBetween(joining, exclusiveEnd),
    completedYears,
    lastAnniversary,
    leftoverDays: daysBetween(lastAnniversary, exclusiveEnd),
  };
}
