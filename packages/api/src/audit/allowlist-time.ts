/**
 * Plan 9's audit keys: ids, dates, counts and flags only. Coordinates,
 * categories, notes and reasons have no key (see time-audit.ts).
 */
type Check = (v: unknown) => boolean;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isInt: Check = (v) => Number.isSafeInteger(v) && (v as number) >= 0;
const uuid: Check = (v) => typeof v === "string" && UUID_RE.test(v);
const date: Check = (v) => typeof v === "string" && ISO_DATE.test(v);

export const TIME_CHECKS: Record<string, Check> = {
  date,
  attendanceId: uuid,
  timesheetId: uuid,
  requestId: uuid,
  dayCount: isInt,
  rowCount: isInt,
  rows: isInt,
  fromYear: isInt,
  activity: isInt,
  locations: isInt,
  pauses: isInt,
  erased: (v) => typeof v === "boolean",
};
