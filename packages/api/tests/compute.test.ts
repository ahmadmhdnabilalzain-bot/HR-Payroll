import fc from "fast-check";
import {
  NOT_COMPUTED_PAY,
  PAY_TRACE_RESULT,
  SERVICE_UNPAID_LEAVE_NOT_ENTERED,
  type PayRunEntry,
} from "@payroll/contract";
import {
  calculateSettlement,
  EngineError,
  fils,
  GRATUITY_PACKS,
  UAE_NATIONAL_REASON,
} from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  computePayRun,
  type RunSnapshot,
  type SnapshotEmployee,
} from "../src/payroll/compute";

const E1 = "00000000-0000-4000-8000-0000000000e1";
const E2 = "00000000-0000-4000-8000-0000000000e2";
const MARCH = { year: 2026, month: 3 };

function emp(over: Partial<SnapshotEmployee> = {}): SnapshotEmployee {
  return {
    employeeId: E1, name: "Asha", joiningDate: "2019-01-01",
    lastWorkingDate: null, workerClass: "expat-full-time",
    salaryVersion: 1, unpaidLeaveDays: 0,
    components: [
      { code: "basic", label: "Basic", amount: fils(400000n),
        sifBucket: "fixed" },
      { code: "housing", label: "Housing", amount: fils(150000n),
        sifBucket: "housing" }],
    ...over,
  };
}

const snap = (employees: SnapshotEmployee[],
  entries: PayRunEntry[] = []): RunSnapshot =>
  ({ period: MARCH, employees, entries });

const both = [{ code: "basic", amount: "3000.00" },
  { code: "housing", amount: "1000.00" }];

describe("computePayRun", () => {
  it("compute_full_month", () => {
    const out = computePayRun(snap([emp()]));
    expect(out.problems).toEqual([]);
    expect(out.gross).toBe(550000n);
    const p = out.payslips[0]!;
    expect(p.lines.map((l) => [l.code, l.amount, l.kind])).toEqual([
      ["basic", 400000n, "recurring"], ["housing", 150000n, "recurring"]]);
    expect(p.gross).toBe(550000n);
    expect(p.net).toBe(550000n);
    expect(p.trace.map((t) => [t.id, t.rules])).toEqual([
      ["pay.basic", []], ["pay.housing", []]]);
    expect(p.trace[0]).toMatchObject({ formula: "entered monthly amount",
      inputs: { salaryVersion: "1" }, result: "400000" });
    for (const t of p.trace) {
      expect(PAY_TRACE_RESULT.safeParse(t.result).success).toBe(true);
    }
    expect(p.notComputed).toEqual([...NOT_COMPUTED_PAY]);
    expect(p.settlement).toBeNull();
  });

  it("compute_joiner_needs_amounts", () => {
    const j = emp({ joiningDate: "2026-03-10" });
    const out = computePayRun(snap([j]));
    expect(out.problems).toEqual([{ employeeId: E1,
      code: "ENTERED_AMOUNTS_REQUIRED", missing: ["basic", "housing"] }]);
    expect(out.payslips).toEqual([]);
    const ok = computePayRun(snap([j], [{ employeeId: E1,
      componentOverrides: both }]));
    expect(ok.problems).toEqual([]);
    expect(ok.gross).toBe(400000n);
    expect(ok.payslips[0]!.lines.every((l) => l.kind === "override"))
      .toBe(true);
    expect(ok.payslips[0]!.trace[0]).toMatchObject({
      formula: "entered amount for this run",
      inputs: { entry: "pay run input" } });
  });

  it("compute_unpaid_leave_needs_amounts", () => {
    const out = computePayRun(snap([emp({ unpaidLeaveDays: 3 })]));
    expect(out.problems[0]?.code).toBe("ENTERED_AMOUNTS_REQUIRED");
  });

  it("one-offs follow recurring lines and add to gross", () => {
    const out = computePayRun(snap([emp()], [{ employeeId: E1,
      oneOffs: [{ code: "bonus", label: "Bonus", amount: "100.00",
        sifBucket: "otherAllowances" }] }]));
    const p = out.payslips[0]!;
    expect(p.lines.at(-1)).toMatchObject({ code: "bonus", kind: "one-off",
      amount: 10000n });
    expect(p.trace.at(-1)?.formula).toBe("entered one-off amount");
    expect(out.gross).toBe(560000n);
  });

  it("lists every problem: no salary, bad codes, duplicates, outsiders",
    () => {
      const out = computePayRun(snap([emp(), emp({ employeeId: E2,
        components: [] })], [
        { employeeId: E1, componentOverrides: [{ code: "nope",
          amount: "1.00" }] },
        { employeeId: E1 },
        { employeeId: "00000000-0000-4000-8000-0000000000ff" }]));
      expect(out.problems).toEqual(expect.arrayContaining([
        { employeeId: E2, code: "SALARY_MISSING", missing: ["salary"] },
        { employeeId: E1, code: "VALIDATION_FAILED", missing: ["nope"] },
        { employeeId: E1, code: "VALIDATION_FAILED",
          missing: ["duplicate entry"] },
        { employeeId: "00000000-0000-4000-8000-0000000000ff",
          code: "EMPLOYEE_NOT_IN_PERIOD", missing: [] }]));
    });

  it("a code twice in one entry is a problem, not a silent pick", () => {
    const out = computePayRun(snap([emp()], [{ employeeId: E1,
      componentOverrides: [{ code: "basic", amount: "1.00" },
        { code: "basic", amount: "2.00" }],
      oneOffs: [
        { code: "bonus", label: "B", amount: "1.00",
          sifBucket: "otherAllowances" },
        { code: "bonus", label: "B", amount: "1.00",
          sifBucket: "otherAllowances" }] }]));
    expect(out.payslips).toEqual([]);
    expect(out.problems).toEqual([{ employeeId: E1,
      code: "VALIDATION_FAILED", missing: ["basic", "bonus"] }]);
  });

  it("people outside the period are not paid", () => {
    const out = computePayRun(snap([emp({ lastWorkingDate: "2026-02-28" }),
      emp({ employeeId: E2, joiningDate: "2026-04-01" })]));
    expect(out.payslips).toEqual([]);
    expect(out.problems).toEqual([]);
  });

  const leaver = (over: Partial<SnapshotEmployee> = {}) =>
    emp({ lastWorkingDate: "2026-03-31", ...over });

  it("compute_leaver_settlement", () => {
    const out = computePayRun(snap([leaver()], [{ employeeId: E1,
      unusedLeaveDays: 0 }]));
    expect(out.problems).toEqual([]);
    const s = out.payslips[0]!.settlement!;
    expect(s.status).toBe("computed");
    if (s.status !== "computed") return;
    const direct = calculateSettlement({ gratuity: {
      joiningDate: "2019-01-01", lastWorkingDate: "2026-03-31",
      unpaidLeaveDays: 0, lastBasicMonthly: fils(400000n),
      workerClass: "expat-full-time" }, unusedLeaveDays: 0 },
      GRATUITY_PACKS);
    expect(s.total).toBe(direct.value.total);
    expect(s.includedInSif).toBe(false);
    expect(s.explanation.arReviewed).toBe(false);
    expect(s.notComputed).toContain(SERVICE_UNPAID_LEAVE_NOT_ENTERED);
    expect(out.gross).toBe(550000n);
  });

  it("the leaver's gratuity uses the stored basic, not an override", () => {
    const withOverride = computePayRun(snap([leaver()], [{ employeeId: E1,
      unusedLeaveDays: 0, serviceUnpaidLeaveDays: 10,
      componentOverrides: [{ code: "basic", amount: "1.00" }] }]));
    const plain = computePayRun(snap([leaver()], [{ employeeId: E1,
      unusedLeaveDays: 0, serviceUnpaidLeaveDays: 10 }]));
    const a = withOverride.payslips[0]!.settlement!;
    const b = plain.payslips[0]!.settlement!;
    expect(a).toEqual(b);
    if (b.status === "computed") {
      expect(b.notComputed).not.toContain(SERVICE_UNPAID_LEAVE_NOT_ENTERED);
    }
  });

  it("compute_leaver_refused", () => {
    let code = "";
    try {
      calculateSettlement({ gratuity: { joiningDate: "2019-01-01",
        lastWorkingDate: "2026-03-31", unpaidLeaveDays: 0,
        lastBasicMonthly: fils(400000n), workerClass: "gcc-national" },
        unusedLeaveDays: 0 }, GRATUITY_PACKS);
    } catch (e) {
      code = (e as EngineError).code;
    }
    expect(code).not.toBe("");
    const out = computePayRun(snap([leaver({ workerClass: "gcc-national" })],
      [{ employeeId: E1, unusedLeaveDays: 0 }]));
    expect(out.payslips.length).toBe(1);
    expect(out.payslips[0]!.settlement).toMatchObject({ status: "refused",
      code });
  });

  it("compute_leaver_needs_leave_days", () => {
    const out = computePayRun(snap([leaver()]));
    expect(out.problems).toEqual([{ employeeId: E1,
      code: "SETTLEMENT_INPUT_REQUIRED", missing: ["unusedLeaveDays"] }]);
  });

  it("compute_uae_national_not_applicable", () => {
    const out = computePayRun(snap([leaver({ workerClass: "uae-national" })],
      [{ employeeId: E1, unusedLeaveDays: 0 }]));
    expect(out.payslips[0]!.settlement).toMatchObject({
      status: "computed", outcome: "not-applicable",
      reason: UAE_NATIONAL_REASON });
  });

  it("compute_deterministic", () => {
    const amount = fc.bigInt({ min: 0n, max: 10_000_000n });
    const people = fc.array(fc.tuple(amount, amount),
      { minLength: 1, maxLength: 50 });
    fc.assert(fc.property(people, (ps) => {
      const s = snap(ps.map(([b, h], i) => emp({
        employeeId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        components: [
          { code: "basic", label: "B", amount: fils(b), sifBucket: "fixed" },
          { code: "housing", label: "H", amount: fils(h),
            sifBucket: "housing" }] })));
      const a = computePayRun(s);
      expect(computePayRun(s)).toEqual(a);
      const sum = a.payslips.flatMap((p) => p.lines)
        .reduce((n, l) => n + l.amount, 0n);
      expect(a.gross).toBe(sum);
    }), { numRuns: 100 });
  });
});
