import { CodedError } from "../coded-error";
import { ISO_DATE, TIME_CHECKS } from "./allowlist-time";

/**
 * Audit `data` is an allowlist: each key has a shape check, and any
 * other key is refused. Salary amounts, IBANs, labour person ids and
 * Emirates ID numbers can never pass: no key carries free text, and
 * money-like, IBAN-like or long digit strings are refused even in
 * allowed string keys.
 */
type Check = (v: unknown) => boolean;

const WORD = /^[a-z][a-z-]{0,39}$/;
const FIELD = /^[a-zA-Z][a-zA-Z0-9.]{0,63}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const SIF_NAME = /^\d{25}\.SIF$/;

const isInt = (v: unknown) => Number.isSafeInteger(v);
const matches = (re: RegExp): Check => (v) =>
  typeof v === "string" && re.test(v) && !looksSensitive(v);

/** Money ("4000.00"), an IBAN, or 12+ digits in a row. */
export function looksSensitive(s: string): boolean {
  return /\d+\.\d{2}\b/.test(s) || /AE\d{6,}/i.test(s) || /\d{12,}/.test(s);
}

const period: Check = (v) => {
  const p = v as { year?: unknown; month?: unknown } | null;
  return typeof v === "object" && p !== null && !Array.isArray(v) &&
    Object.keys(p).sort().join() === "month,year" &&
    isInt(p.year) && isInt(p.month);
};

const CHECKS: Record<string, Check> = {
  changed: (v) => Array.isArray(v) && v.every(matches(FIELD)),
  role: matches(WORD),
  // A role word (role changes) or a date (roster ranges).
  from: (v) => matches(WORD)(v) || matches(ISO_DATE)(v),
  to: (v) => matches(WORD)(v) || matches(ISO_DATE)(v),
  status: matches(WORD),
  version: isInt,
  count: isInt,
  // Whole days, or half days on a leave request (Plan 9).
  days: (v) => typeof v === "number" && Number.isSafeInteger(v * 2),
  year: isInt,
  employeeCount: isInt,
  errorCount: isInt,
  warningCount: isInt,
  period,
  inputHash: (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v),
  // The SIF name is employer id + date + time: not personal data.
  fileName: (v) => typeof v === "string" && SIF_NAME.test(v),
  // A uuid is hex and may hold a long digit run; its shape is enough.
  employeeId: (v) => typeof v === "string" && UUID_RE.test(v),
  leaveTypeId: (v) => typeof v === "string" && UUID_RE.test(v),
  oldClockIn: matches(TIME),
  oldClockOut: matches(TIME),
  newClockIn: matches(TIME),
  newClockOut: matches(TIME),
  ...TIME_CHECKS,
};

export const AUDIT_KEYS = Object.keys(CHECKS);

export function assertAllowedAuditData(data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    const check = CHECKS[k];
    if (check === undefined || !check(v)) {
      throw new CodedError("AUDIT_SENSITIVE_DATA",
        "audit data key is not allowed or has an unsafe value", { key: k });
    }
  }
}
