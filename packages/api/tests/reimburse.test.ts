import { REIMBURSEMENT_WPS_NOTE } from "@payroll/contract";
import { fils, type Fils } from "@payroll/engine";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyReimbursements } from "../src/expenses/reimburse";
import {
  computePayRun,
  type ComputedPayslip,
  type RunSnapshot,
  type SnapshotEmployee,
  type SnapshotReimbursement,
} from "../src/payroll/compute";

const E1 = "00000000-0000-4000-8000-0000000000e1";
const E2 = "00000000-0000-4000-8000-0000000000e2";
const C1 = "00000000-0000-4000-8000-0000000006c1";
const C2 = "00000000-0000-4000-8000-0000000006c2";

const emp = (over: Partial<SnapshotEmployee> = {}): SnapshotEmployee => ({
  employeeId: E1, name: "Asha", joiningDate: "2019-01-01",
  lastWorkingDate: null, workerClass: "expat-full-time", salaryVersion: 1,
  bank: { routingCode: "803320101", iban: "AE070331234567890123456" },
  labourPersonId: "00000000000001",
  unpaidLeaveDays: 0, components: [
    { code: "basic", label: "Basic", amount: fils(400000n),
      sifBucket: "fixed" },
    { code: "housing", label: "Housing", amount: fils(150000n),
      sifBucket: "housing" }], ...over });

function slip(): ComputedPayslip {
  const s: RunSnapshot = { period: { year: 2026, month: 3 },
    employees: [emp()], entries: [], reimbursements: [] };
  return computePayRun(s).payslips[0]!;
}
const claim = (claimId: string, amount: bigint, employeeId = E1)
  : SnapshotReimbursement => ({ employeeId, claimId, title: "Trip",
  amount: fils(amount) });

describe("applyReimbursements", () => {
  it("no_claims_changes_nothing_but_fields", () => {
    const base = slip();
    const out = applyReimbursements(base, []);
    expect(out.gross).toBe(550000n);
    expect(out.salaryNet).toBe(550000n);
    expect(out.net).toBe(550000n);
    expect(out.reimbursementTotal).toBe(0n);
    expect(out.reimbursements).toEqual([]);
    expect(out.reimbursementNote).toBeNull();
    expect(out.trace).toEqual(base.trace);
  });

  it("adds_outside_gross", () => {
    const base = slip();
    const out = applyReimbursements(base, [claim(C1, 25000n)]);
    expect(out.gross).toBe(550000n);
    expect(out.salaryNet).toBe(550000n);
    expect(out.reimbursementTotal).toBe(25000n);
    expect(out.net).toBe(575000n);
    expect(out.lines).toEqual(base.lines);
    expect(out.reimbursementNote).toBe(REIMBURSEMENT_WPS_NOTE);
    expect(out.reimbursements).toEqual([{ claimId: C1, label: "Trip",
      amount: 25000n, traceId: `reimb.claim#${C1}` }]);
    expect(out.trace.slice(-3).map((t) => t.id)).toEqual([
      `reimb.claim#${C1}`, "reimb.total", "pay.net-with-reimbursements"]);
    expect(out.trace.at(-1)!.result).toBe("575000");
    expect(out.trace.slice(0, base.trace.length)).toEqual(base.trace);
  });

  it("ignores_other_employees", () => {
    const out = applyReimbursements(slip(), [claim(C1, 100n, E2)]);
    expect(out.reimbursementTotal).toBe(0n);
    expect(out.net).toBe(550000n);
  });

  it("order_is_stable", () => {
    const a = applyReimbursements(slip(), [claim(C1, 1n), claim(C2, 2n)]);
    const b = applyReimbursements(slip(), [claim(C2, 2n), claim(C1, 1n)]);
    expect(b).toEqual(a);
    expect(a.reimbursements.map((r) => r.claimId)).toEqual([C1, C2]);
  });

  it("never touches gross, lines, settlement or earlier trace", () => {
    const amounts = fc.array(fc.bigInt({ min: 1n, max: 100_000_000n }),
      { maxLength: 10 });
    fc.assert(fc.property(amounts, fc.bigInt({ min: 0n,
      max: 10_000_000n }), (xs, basic) => {
      const s: RunSnapshot = { period: { year: 2026, month: 3 },
        employees: [emp({ components: [{ code: "basic", label: "Basic",
          amount: fils(basic), sifBucket: "fixed" }] })], entries: [],
        reimbursements: [] };
      const base = computePayRun(s).payslips[0]!;
      const claims = xs.map((x, i) => claim(
        `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, x));
      const out = applyReimbursements(base, claims);
      expect(out.gross).toBe(base.gross);
      expect(out.lines).toEqual(base.lines);
      expect(out.settlement).toEqual(base.settlement);
      expect(out.trace.slice(0, base.trace.length)).toEqual(base.trace);
      expect(out.net).toBe(out.salaryNet + out.reimbursementTotal);
      expect(out.salaryNet).toBe(base.net);
      const sum = xs.reduce((n, x) => n + x, 0n);
      expect(out.reimbursementTotal).toBe(sum as Fils);
    }), { numRuns: 200 });
  });
});
