import { daysInMonth, formatIsoDate, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import type { Fils } from "../money";
import type { PayrollParams } from "./params";
import type {
  PayEmployee,
  PayslipInput,
  PayWindow,
} from "./types";

const CODE = /^[A-Za-z0-9-]{1,20}$/;
const CLASSES: readonly string[] = ["expat-full-time", "uae-national",
  "gcc-national"];
/** The GPSSA employee share's ref; no deduction or loan may take it. */
const RESERVED_REF = "gpssa";

function fail(code: string, message: string, field: string,
  value: string): never {
  throw new EngineError(code, message, { field, value });
}

const isWhole = (n: number): boolean => Number.isSafeInteger(n);

/** Year 2000..9999 and month 1..12, checked before any date is built. */
export function checkPeriod(year: number, month: number): void {
  if (!isWhole(year) || year < 2000 || year > 9999) {
    fail("INVALID_PERIOD", "year must be 2000 to 9999", "year",
      String(year));
  }
  if (!isWhole(month) || month < 1 || month > 12) {
    fail("INVALID_PERIOD", "month must be 1 to 12", "month", String(month));
  }
}

function checkAmount(a: Fils, field: string, min: bigint): void {
  if (a < min) {
    fail("INVALID_AMOUNT", `${field} must be at least ${min} fils`, field,
      String(a));
  }
}

function checkCode(code: string, field: string, seen: Set<string>): void {
  if (!CODE.test(code)) {
    fail("INVALID_CODE", "codes are 1 to 20 letters, digits or hyphens",
      field, code);
  }
  if (seen.has(code)) {
    fail("DUPLICATE_CODE", "the code is used twice", field, code);
  }
  seen.add(code);
}

function checkEmployeeDates(e: PayEmployee): void {
  parseIsoDate(e.joiningDate, "employee.joiningDate");
  const later = [["leavingDate", e.leavingDate],
    ["probationEndDate", e.probationEndDate]] as const;
  for (const [name, value] of later) {
    if (value === null) continue;
    const field = `employee.${name}`;
    parseIsoDate(value, field);
    if (value < e.joiningDate) {
      fail("INVALID_DATE_RANGE", `${name} is before the joining date`,
        field, value);
    }
  }
}

function checkEmployee(e: PayEmployee, p: PayrollParams): void {
  if (!CLASSES.includes(e.workerClass)) {
    fail("UNSUPPORTED_WORKER_CLASS", "unknown worker class",
      "employee.workerClass", String(e.workerClass));
  }
  checkEmployeeDates(e);
  checkAmount(e.basicMonthly, "employee.basicMonthly", 1n);
  const seen = new Set<string>();
  e.allowances.forEach((a, i) => {
    checkCode(a.code, `employee.allowances[${i}].code`, seen);
    checkAmount(a.monthly, `employee.allowances[${i}].monthly`, 0n);
  });
  const h = e.normalHoursPerDay;
  if (!isWhole(h) || h < 1 || BigInt(h) > p.maxNormalHoursPerDay.v) {
    fail("INVALID_HOURS", "normal hours per day must be a whole number " +
      `from 1 to ${p.maxNormalHoursPerDay.v}`, "employee.normalHoursPerDay",
      String(h));
  }
}

function payWindow(input: PayslipInput): PayWindow {
  const { year, month, employee: e } = input;
  const days = daysInMonth(year, month);
  const monthStart = formatIsoDate({ y: year, m: month, d: 1 });
  const monthEnd = formatIsoDate({ y: year, m: month, d: days });
  if (e.joiningDate > monthEnd) {
    fail("NOT_EMPLOYED_IN_PERIOD", "joined after the pay month",
      "employee.joiningDate", e.joiningDate);
  }
  if (e.leavingDate !== null && e.leavingDate < monthStart) {
    fail("NOT_EMPLOYED_IN_PERIOD", "left before the pay month",
      "employee.leavingDate", e.leavingDate);
  }
  const payStart = e.joiningDate > monthStart ? e.joiningDate : monthStart;
  const payEnd = e.leavingDate !== null && e.leavingDate < monthEnd
    ? e.leavingDate : monthEnd;
  return { year, month, daysInMonth: days, monthStart, monthEnd, payStart,
    payEnd };
}

/** Each date is real, inside the employed span and listed once. */
function checkDates(dates: string[], field: string, w: PayWindow): void {
  const seen = new Set<string>();
  dates.forEach((d, i) => {
    const f = `${field}[${i}].date`;
    parseIsoDate(d, f);
    if (d < w.payStart || d > w.payEnd) {
      fail("DATE_OUTSIDE_PAY_PERIOD", `the date is outside ${w.payStart} ` +
        `to ${w.payEnd}`, f, d);
    }
    if (seen.has(d)) fail("DUPLICATE_DATE", "the date is listed twice", f, d);
    seen.add(d);
  });
}

/** Minutes in a "HH:MM-HH:MM" window that may cross midnight. */
function windowMinutes(window: string): number {
  const [a, b] = window.split("-").map((t) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  });
  return ((b ?? 0) - (a ?? 0) + 1440) % 1440 || 1440;
}

function checkMinutes(input: PayslipInput, p: PayrollParams): void {
  const night = windowMinutes(p.nightWindow.v);
  input.overtime.forEach((o, i) => {
    const f = `overtime[${i}]`;
    if (!isWhole(o.minutes) || o.minutes < 1 || o.minutes > 1440) {
      fail("INVALID_MINUTES", "minutes must be 1 to 1440", `${f}.minutes`,
        String(o.minutes));
    }
    const n = o.nightMinutes;
    if (!isWhole(n) || n < 0 || n > o.minutes || n > night) {
      fail("INVALID_MINUTES", "night minutes must be 0 to the minutes " +
        `and at most ${night} (the night window)`, `${f}.nightMinutes`,
      String(n));
    }
  });
}

function checkDays(input: PayslipInput, w: PayWindow,
  p: PayrollParams): void {
  checkDates(input.absences.map((a) => a.date), "absences", w);
  checkDates(input.overtime.map((o) => o.date), "overtime", w);
  checkDates(input.restDayWork.map((r) => r.date), "restDayWork", w);
  checkMinutes(input, p);
  const absent = new Set(input.absences.map((a) => a.date));
  const work = [...input.overtime, ...input.restDayWork];
  for (const { date } of work) {
    if (absent.has(date)) {
      fail("WORK_ON_ABSENCE_DATE", "work is recorded on an absence date",
        "date", date);
    }
  }
}

function checkLeave(input: PayslipInput, w: PayWindow): void {
  const counters = [["sickDaysUsedBefore", input.sickDaysUsedBefore],
    ["maternityDaysUsedBefore", input.maternityDaysUsedBefore],
    ["encashLeaveDays", input.encashLeaveDays]] as const;
  for (const [field, n] of counters) {
    if (!isWhole(n) || n < 0) {
      fail("INVALID_LEAVE_DAYS", `${field} must be a whole number of ` +
        "at least 0", field, String(n));
    }
  }
  const leaving = input.employee.leavingDate;
  if (input.encashLeaveDays > 0 && leaving !== null &&
    leaving <= w.monthEnd) {
    fail("ENCASHMENT_AT_EXIT", "leave is paid out at exit by " +
      "calculateSettlement, not on the payslip", "encashLeaveDays",
      String(input.encashLeaveDays));
  }
}

function checkConsent(given: boolean, needed: boolean, field: string):
  void {
  if (needed && !given) {
    fail("CONSENT_REQUIRED", "written consent must be on file", field,
      "false");
  }
}

function checkDeductions(input: PayslipInput, p: PayrollParams): void {
  const refs = new Set<string>([RESERVED_REF]);
  input.deductions.forEach((d, i) => {
    const f = `deductions[${i}]`;
    checkCode(d.ref, `${f}.ref`, refs);
    checkAmount(d.amount, `${f}.amount`, 1n);
    checkConsent(d.consentOnFile, d.kind === "scheme" &&
      p.schemeConsentRequired.v, `${f}.consentOnFile`);
  });
  input.loans.forEach((l, i) => {
    const f = `loans[${i}]`;
    checkCode(l.ref, `${f}.ref`, refs);
    checkAmount(l.instalment, `${f}.instalment`, 1n);
    checkAmount(l.balance, `${f}.balance`, 0n);
    checkConsent(l.consentOnFile, p.loanConsentRequired.v,
      `${f}.consentOnFile`);
  });
}

function checkGpssa(e: PayEmployee): void {
  const g = e.gpssa;
  if (e.workerClass === "uae-national" && g === null) {
    fail("GPSSA_INPUT_REQUIRED", "a UAE national needs GPSSA input",
      "employee.gpssa", "null");
  }
  if (e.workerClass !== "uae-national" && g !== null) {
    fail("GPSSA_INPUT_NOT_EXPECTED", "GPSSA input is for UAE nationals " +
      "only", "employee.gpssa", e.workerClass);
  }
  if (g === null) return;
  checkAmount(g.fixingBasic, "employee.gpssa.fixingBasic", 0n);
  checkAmount(g.fixingAllowances, "employee.gpssa.fixingAllowances", 0n);
  checkAmount(g.arrears, "employee.gpssa.arrears", 0n);
}

/** Refuses any input the payslip cannot price; returns the pay window. */
export function validatePayslipInput(input: PayslipInput,
  p: PayrollParams): PayWindow {
  checkPeriod(input.year, input.month);
  checkEmployee(input.employee, p);
  checkGpssa(input.employee);
  const w = payWindow(input);
  checkDays(input, w, p);
  checkLeave(input, w);
  checkDeductions(input, p);
  return w;
}
