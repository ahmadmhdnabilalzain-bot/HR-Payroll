import { describe, expect, it } from "vitest";
import { fils } from "../src/money";
import type { DeductionRequest, LoanInstalment } from "../src/payroll/types";
import { validatePayslipInput } from "../src/payroll/validate";
import {
  codeOf,
  detailOf,
  fx,
  gpssaInput,
  P,
  type FxPatch,
} from "./payroll-fixture";

const check = (patch: FxPatch) => () => validatePayslipInput(fx(patch), P);
const code = (patch: FxPatch) => codeOf(check(patch));
const detail = (patch: FxPatch) => detailOf(check(patch));

const ded = (o: Partial<DeductionRequest> = {}): DeductionRequest => ({
  ref: "D1", kind: "overpayment", amount: fils(1000n),
  consentOnFile: true, ...o });
const loan = (o: Partial<LoanInstalment> = {}): LoanInstalment => ({
  ref: "L1", instalment: fils(1000n), balance: fils(5000n),
  consentOnFile: true, ...o });
const ot = (date: string, minutes = 60, nightMinutes = 0) =>
  ({ date, minutes, nightMinutes });
const rest = (date: string) =>
  ({ date, kind: "rest-day" as const, compensation: "pay" as const });
const JOIN_11 = { joiningDate: "2026-06-11" };

describe("validatePayslipInput windows", () => {
  it("returns the full June window", () => {
    expect(validatePayslipInput(fx(), P)).toEqual({ year: 2026, month: 6,
      daysInMonth: 30, monthStart: "2026-06-01", monthEnd: "2026-06-30",
      payStart: "2026-06-01", payEnd: "2026-06-30" });
  });
  it("starts a joiner on the joining date", () => {
    expect(validatePayslipInput(fx({ employee: JOIN_11 }), P).payStart)
      .toBe("2026-06-11");
  });
  it("ends a leaver on the leaving date", () => {
    const w = validatePayslipInput(fx({ month: 3,
      employee: { leavingDate: "2026-03-15" } }), P);
    expect(w.payEnd).toBe("2026-03-15");
    expect(w.daysInMonth).toBe(31);
  });
  it("refuses bad periods and spans", () => {
    expect(code({ month: 13 })).toBe("INVALID_PERIOD");
    expect(detail({ month: 13 }).field).toBe("month");
    expect(code({ year: 1999 })).toBe("INVALID_PERIOD");
    expect(code({ employee: { joiningDate: "2026-07-01" } }))
      .toBe("NOT_EMPLOYED_IN_PERIOD");
    expect(code({ employee: { leavingDate: "2026-05-31" } }))
      .toBe("NOT_EMPLOYED_IN_PERIOD");
    expect(code({ employee: { leavingDate: "2019-01-01" } }))
      .toBe("INVALID_DATE_RANGE");
    expect(code({ employee: { probationEndDate: "2019-01-01" } }))
      .toBe("INVALID_DATE_RANGE");
    expect(code({ employee: { joiningDate: "2026-02-30" } }))
      .toBe("INVALID_DATE");
  });
});

describe("validatePayslipInput amounts and codes", () => {
  it("refuses bad amounts", () => {
    const allowance = { code: "x", kind: "other" as const,
      monthly: fils(-1n) };
    const cases: FxPatch[] = [
      { employee: { basicMonthly: fils(0n) } },
      { employee: { allowances: [allowance] } },
      { deductions: [ded({ amount: fils(0n) })] },
      { loans: [loan({ balance: fils(-1n) })] },
      { loans: [loan({ instalment: fils(0n) })] },
    ];
    for (const c of cases) expect(code(c)).toBe("INVALID_AMOUNT");
    expect(detail(cases[0]!).field).toBe("employee.basicMonthly");
  });
  it("refuses bad codes", () => {
    const a = (code: string) => ({ code, kind: "housing" as const,
      monthly: fils(1n) });
    expect(code({ employee: { allowances: [a("has space")] } }))
      .toBe("INVALID_CODE");
    expect(code({ employee: { allowances: [a("housing"), a("housing")] } }))
      .toBe("DUPLICATE_CODE");
    expect(code({ deductions: [ded({ ref: "L1" })], loans: [loan()] }))
      .toBe("DUPLICATE_CODE");
    expect(detail({ deductions: [ded({ ref: "gpssa" })] }).value)
      .toBe("gpssa");
  });
  it("refuses nine normal hours", () => {
    for (const h of [9, 0, 7.5]) {
      expect(code({ employee: { normalHoursPerDay: h } }))
        .toBe("INVALID_HOURS");
    }
  });
  it("refuses bad minutes", () => {
    for (const e of [ot("2026-06-04", 0), ot("2026-06-04", 1441),
      ot("2026-06-04", 60, 61)]) {
      expect(code({ overtime: [e] })).toBe("INVALID_MINUTES");
    }
  });
});

describe("validatePayslipInput dates", () => {
  it("refuses dates outside the employed span", () => {
    const d = "2026-06-05";
    const patches: FxPatch[] = [
      { employee: JOIN_11, absences: [{ date: d, kind: "unpaid" }] },
      { employee: JOIN_11, overtime: [ot(d)] },
      { employee: JOIN_11, restDayWork: [rest(d)] },
      { absences: [{ date: "2026-07-01", kind: "unpaid" }] },
    ];
    for (const p of patches) {
      expect(code(p)).toBe("DATE_OUTSIDE_PAY_PERIOD");
    }
    expect(detail(patches[0]!).value).toBe(d);
  });
  it("refuses a date listed twice", () => {
    const d = "2026-06-03";
    const twice = { absences: [{ date: d, kind: "sick" as const },
      { date: d, kind: "unpaid" as const }] };
    expect(code(twice)).toBe("DUPLICATE_DATE");
    expect(detail(twice).value).toBe(d);
    const ots = { overtime: [ot("2026-06-04"), ot("2026-06-04")] };
    expect(code(ots)).toBe("DUPLICATE_DATE");
    expect(detail(ots).value).toBe("2026-06-04");
  });
  it("refuses work on an absence date", () => {
    const d = "2026-06-03";
    expect(code({ absences: [{ date: d, kind: "unpaid" }],
      overtime: [ot(d)] })).toBe("WORK_ON_ABSENCE_DATE");
    expect(code({ absences: [{ date: d, kind: "sick" }],
      restDayWork: [rest(d)] })).toBe("WORK_ON_ABSENCE_DATE");
  });
});

describe("validatePayslipInput leave, consent and GPSSA", () => {
  it("refuses bad leave counters", () => {
    expect(code({ sickDaysUsedBefore: -1 })).toBe("INVALID_LEAVE_DAYS");
    expect(code({ encashLeaveDays: 1.5 })).toBe("INVALID_LEAVE_DAYS");
  });
  it("sends exit encashment to the settlement", () => {
    expect(code({ employee: { leavingDate: "2026-06-20" },
      encashLeaveDays: 5 })).toBe("ENCASHMENT_AT_EXIT");
  });
  it("requires consent for loans and schemes", () => {
    expect(code({ loans: [loan({ consentOnFile: false })] }))
      .toBe("CONSENT_REQUIRED");
    expect(code({ deductions: [ded({ kind: "scheme",
      consentOnFile: false })] })).toBe("CONSENT_REQUIRED");
    expect(code({ deductions: [ded({ consentOnFile: false })] }))
      .toBe("NONE");
  });
  it("matches GPSSA input to the worker class", () => {
    expect(code({ employee: { workerClass: "uae-national" } }))
      .toBe("GPSSA_INPUT_REQUIRED");
    expect(code({ employee: { gpssa: gpssaInput() } }))
      .toBe("GPSSA_INPUT_NOT_EXPECTED");
    expect(code({ employee: { workerClass: "x" as "uae-national" } }))
      .toBe("UNSUPPORTED_WORKER_CLASS");
    expect(code({ employee: { workerClass: "uae-national",
      gpssa: gpssaInput({ arrears: fils(-1n) }) } }))
      .toBe("INVALID_AMOUNT");
    expect(code({ employee: { workerClass: "uae-national",
      gpssa: gpssaInput() } })).toBe("NONE");
  });
});
