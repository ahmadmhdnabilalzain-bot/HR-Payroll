import { describe, expect, it } from "vitest";
import { fils } from "../src/money";
import {
  applyDeductions,
  type DeductionArgs,
} from "../src/payroll/deductions";
import { loadPayrollParams } from "../src/payroll/params";
import type {
  DeductionKind,
  DeductionRequest,
  LoanInstalment,
} from "../src/payroll/types";
import { PAYROLL_PACKS } from "../src/rules/payroll-pack";
import { TraceBuilder } from "../src/trace";
import { codeOf, P } from "./payroll-fixture";

let n = 0;
const req = (kind: DeductionKind, amount: bigint): DeductionRequest =>
  ({ ref: `R${(n += 1)}`, kind, amount: fils(amount),
    consentOnFile: true });
const loan = (instalment: bigint, balance: bigint, ref = "L1"):
  LoanInstalment => ({ ref, instalment: fils(instalment),
  balance: fils(balance), consentOnFile: true });

function run(a: Partial<DeductionArgs>, p = P) {
  const t = new TraceBuilder();
  const r = applyDeductions({ earnedWage: fils(1500000n),
    contractualWage: fils(1500000n), gpssaShare: null, requests: [],
    loans: [], ...a }, p, t);
  return { ...r, amounts: r.lines.map((l) => l.amount), trace: t.lines() };
}
const codes = (r: { flags: { code: string }[] }) =>
  r.flags.map((f) => f.code);

describe("applyDeductions caps", () => {
  it("sets the caps from the earned wage", () => {
    const r = run({});
    expect(r.caps).toEqual({ wageBase: 1500000n, overall: 750000n });
    expect(r.total).toBe(0n);
    expect(r.trace.map((l) => l.id)).toEqual(["cap.base", "cap.overall",
      "ded.total"]);
  });
  it("uses the stricter violation cap and flags it", () => {
    const r = run({ requests: [req("violation", 100000n)] });
    expect(r.amounts).toEqual([75000n]);
    expect(r.deferred).toEqual([{ ref: r.lines[0]!.traceId.split("#")[1],
      kind: "violation", requested: 100000n, taken: 75000n,
      deferred: 25000n, reason: "kind-cap" }]);
    expect(codes(r)).toEqual(["DEDUCTION_DEFERRED",
      "VIOLATION_CAP_CONFLICT"]);
    const conflict = r.flags.find((f) =>
      f.code === "VIOLATION_CAP_CONFLICT");
    expect(conflict?.detail).toMatchObject({ fivePercent: "75000",
      fiveDays: "250000", used: "75000" });
  });
  it("shrinks the violation cap in a joiner month", () => {
    const r = run({ earnedWage: fils(1000001n),
      requests: [req("violation", 100000n)] });
    expect(r.amounts).toEqual([50000n]);
  });
  it("caps overpayment recovery at 20%", () => {
    const r = run({ requests: [req("overpayment", 400000n)] });
    expect(r.amounts).toEqual([300000n]);
    expect(r.deferred[0]?.deferred).toBe(100000n);
  });
  it("caps damage at five days' wage", () => {
    const r = run({ requests: [req("damage", 300000n)] });
    expect(r.amounts).toEqual([250000n]);
    expect(r.deferred[0]?.deferred).toBe(50000n);
  });
  it("shares a kind cap across requests", () => {
    const r = run({ requests: [req("overpayment", 200000n),
      req("overpayment", 200000n)] });
    expect(r.amounts).toEqual([200000n, 100000n]);
    expect(r.deferred.map((d) => d.deferred)).toEqual([100000n]);
  });
});

describe("applyDeductions order and overall cap", () => {
  it("stops at 50% in the stated order", () => {
    const r = run({ requests: [req("damage", 250000n),
      req("overpayment", 300000n), req("court-debt", 375000n)] });
    expect(r.lines.map((l) => l.kind)).toEqual(["court-debt",
      "overpayment", "damage"]);
    expect(r.amounts).toEqual([375000n, 300000n, 75000n]);
    expect(r.deferred).toMatchObject([{ kind: "damage",
      deferred: 175000n, reason: "overall-cap" }]);
    expect(r.total).toBe(750000n);
  });
  it("takes the GPSSA share first", () => {
    const r = run({ gpssaShare: fils(165000n),
      requests: [req("court-debt", 375000n), req("overpayment", 300000n)] });
    expect(r.lines[0]?.traceId).toBe("ded.gpssa");
    expect(r.amounts).toEqual([165000n, 375000n, 210000n]);
    expect(r.deferred).toMatchObject([{ deferred: 90000n,
      reason: "overall-cap" }]);
    expect(r.total).toBe(750000n);
  });
  it("takes only the loan balance", () => {
    const a = run({ loans: [loan(200000n, 150000n)] });
    expect(a.amounts).toEqual([150000n]);
    expect(a.loanBalances).toEqual([{ ref: "L1", before: 150000n,
      after: 0n }]);
    expect(a.deferred).toEqual([]);
    const b = run({ loans: [loan(200000n, 0n)] });
    expect(b.amounts).toEqual([0n]);
    expect(b.loanBalances[0]?.after).toBe(0n);
    expect(b.deferred).toEqual([]);
    const c = run({ loans: [loan(100000n, 500000n)] });
    expect(c.amounts).toEqual([100000n]);
    expect(c.loanBalances[0]?.after).toBe(400000n);
  });
  it("defers a loan when the cap is used", () => {
    const r = run({ requests: [req("court-debt", 375000n),
      req("overpayment", 300000n)], loans: [loan(100000n, 500000n)] });
    expect(r.amounts).toEqual([375000n, 300000n, 75000n]);
    expect(r.deferred).toMatchObject([{ ref: "L1", kind: "loan",
      deferred: 25000n, reason: "overall-cap" }]);
    expect(r.loanBalances).toEqual([{ ref: "L1", before: 500000n,
      after: 425000n }]);
    const line = r.trace.find((l) => l.id === "ded.loan#L1");
    expect(line?.inputs).toMatchObject({ ref: "L1", requested: "100000",
      kindCap: "none", taken: "75000", deferred: "25000",
      balanceBefore: "500000", balanceAfter: "425000" });
  });
  it("defers the GPSSA share beyond the cap", () => {
    const r = run({ earnedWage: fils(49999n), gpssaShare: fils(165000n) });
    expect(r.caps.overall).toBe(24999n);
    expect(r.deferred).toEqual([{ ref: "gpssa", kind: "gpssa",
      requested: 165000n, taken: 24999n, deferred: 140001n,
      reason: "overall-cap" }]);
    expect(codes(r)).toEqual(["DEDUCTION_DEFERRED",
      "GPSSA_SHARE_DEFERRED"]);
  });
  it("defers everything in a fully unpaid month", () => {
    const r = run({ earnedWage: fils(0n), gpssaShare: fils(165000n) });
    expect(r.amounts).toEqual([0n]);
    expect(r.deferred[0]?.deferred).toBe(165000n);
  });
  it("follows an overridden order", () => {
    const order = "loan,gpssa,court-debt,overpayment,violation,damage," +
      "scheme";
    const p = loadPayrollParams(PAYROLL_PACKS[0]!,
      { deductionOrder: order });
    const r = run({ requests: [req("court-debt", 375000n)],
      loans: [loan(500000n, 500000n)] }, p);
    expect(r.lines.map((l) => l.kind)).toEqual(["loan", "court-debt"]);
    expect(r.amounts).toEqual([500000n, 250000n]);
    const bad = loadPayrollParams(PAYROLL_PACKS[0]!,
      { deductionOrder: "gpssa" });
    expect(codeOf(() => run({}, bad))).toBe("INVALID_PARAM");
  });
});
