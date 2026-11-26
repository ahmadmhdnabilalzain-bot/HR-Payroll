import {
  calculateSettlement,
  EngineError,
  fils,
  GRATUITY_PACKS,
  UAE_NATIONAL_REASON,
  type WorkerClass,
} from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { toMoney } from "../src/db/money";
import { computeExitSettlement } from "../src/exits/settlement";
import { computePayRun } from "../src/payroll/compute";

const BASIC = fils(400000n);
const base = { joiningDate: "2019-01-01", lastWorkingDate: "2026-03-31",
  workerClass: "expat-full-time" as WorkerClass, lastBasicMonthly: BASIC,
  unusedLeaveDays: 10, serviceUnpaidLeaveDays: 0 };

function engine(i: typeof base) {
  return calculateSettlement({ gratuity: { joiningDate: i.joiningDate,
    lastWorkingDate: i.lastWorkingDate,
    unpaidLeaveDays: i.serviceUnpaidLeaveDays,
    lastBasicMonthly: i.lastBasicMonthly, workerClass: i.workerClass },
    unusedLeaveDays: i.unusedLeaveDays }, GRATUITY_PACKS);
}

describe("computeExitSettlement (pure)", () => {
  it("exit_settlement_over_wire_cap_refused", () => {
    const s = computeExitSettlement({ ...base,
      lastBasicMonthly: fils(9_000_000_000_00n) });
    expect(s).toMatchObject({ status: "refused",
      code: "AMOUNT_TOO_LARGE" });
  });

  it("exit_settlement_equals_engine", () => {
    const s = computeExitSettlement(base);
    const e = engine(base).value;
    expect(s.status).toBe("computed");
    if (s.status !== "computed") return;
    expect(s.total).toBe(toMoney(e.total));
    expect(s.gratuity).toBe(toMoney(e.gratuity));
    expect(s.leavePay).toBe(toMoney(e.leavePay));
    expect(s.includedInSif).toBe(false);
    expect(s.explanation.arReviewed).toBe(false);
  });

  it("exit_settlement_shows_engine_not_computed_verbatim", () => {
    const s = computeExitSettlement(base);
    if (s.status !== "computed") throw new Error("refused");
    expect(s.notComputed).toEqual(engine(base).value.notComputed);
  });

  it("exit_settlement_gcc_refused", () => {
    const gcc = { ...base, workerClass: "gcc-national" as WorkerClass };
    let code = "";
    try {
      engine(gcc);
    } catch (e) {
      code = (e as EngineError).code;
    }
    expect(code).not.toBe("");
    const s = computeExitSettlement(gcc);
    expect(s).toMatchObject({ status: "refused", code });
  });

  it("exit_settlement_uae_not_applicable", () => {
    const s = computeExitSettlement({ ...base,
      workerClass: "uae-national" });
    if (s.status !== "computed") throw new Error("refused");
    expect(s.outcome).toBe("not-applicable");
    expect(s.reason).toBe(UAE_NATIONAL_REASON);
  });

  it("exit_settlement_matches_payslip_settlement", () => {
    const E1 = "00000000-0000-4000-8000-0000000000e1";
    const out = computePayRun({ period: { year: 2026, month: 3 },
      employees: [{ employeeId: E1, name: "Asha", joiningDate:
        base.joiningDate, lastWorkingDate: base.lastWorkingDate,
        workerClass: base.workerClass, salaryVersion: 1,
        unpaidLeaveDays: 0, labourPersonId: "00000000000001",
        bank: { routingCode: "803320101", iban: "AE070331234567890123456" },
        components: [{ code: "basic", label: "Basic",
          amount: BASIC, sifBucket: "fixed" }] }],
      entries: [{ employeeId: E1, unusedLeaveDays: base.unusedLeaveDays,
        serviceUnpaidLeaveDays: base.serviceUnpaidLeaveDays }],
      reimbursements: [] });
    const slip = out.payslips[0]!.settlement;
    if (slip === null || slip.status !== "computed") {
      throw new Error("no payslip settlement");
    }
    const s = computeExitSettlement(base);
    if (s.status !== "computed") throw new Error("refused");
    expect(s.total).toBe(toMoney(slip.total));
    expect(s.gratuity).toBe(toMoney(slip.gratuity));
    expect(s.leavePay).toBe(toMoney(slip.leavePay));
    expect(s.notComputed).toEqual(slip.notComputed);
    expect(s.trace).toEqual(slip.trace);
  });
});
