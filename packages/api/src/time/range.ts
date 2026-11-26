import { daysBetween } from "@payroll/engine";
import { ApiError } from "../http/errors";

/** The default longest range a Plan 9 range route accepts (days). */
export const MAX_RANGE_DAYS = 62;

/**
 * `to < from`: 400 VALIDATION_FAILED; more than `maxDays` days
 * (inclusive): 400 RANGE_TOO_LONG.
 */
export function assertRange(from: string, to: string,
  maxDays = MAX_RANGE_DAYS): void {
  if (to < from) {
    throw new ApiError("VALIDATION_FAILED", "to is before from",
      { fields: ["query.to"] });
  }
  if (daysBetween(from, to) + 1 > maxDays) {
    throw new ApiError("RANGE_TOO_LONG", undefined,
      { maxDays: String(maxDays) });
  }
}
