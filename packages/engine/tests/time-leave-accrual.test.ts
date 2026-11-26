import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { TIME_PACKS } from "../src/rules/time-pack";
import {
  accruedHalves,
  balanceHalves,
  carryOverHalves,
  checkLeavePolicy,
} from "../src/time/leave-accrual";
import { loadTimeParams } from "../src/time/params";
import type {
  BalanceInput,
  LeaveAccrualPolicy,
  LeavePolicyFacts,
} from "../src/time/types";

const P = loadTimeParams(TIME_PACKS[0]!, undefined);

const upfront = (annualDays: number, joiningYearProRata = false):
  LeaveAccrualPolicy => ({ accrual: "upfront", annualDays,
  joiningYearProRata });
const monthly = (annualDays: number): LeaveAccrualPolicy =>
  ({ accrual: "monthly", annualDays, joiningYearProRata: false });

function facts(over: Partial<LeavePolicyFacts>): LeavePolicyFacts {
  return { payrollKind: "annual", annualDays: 30, accrual: "upfront",
    dayCount: "calendar", carryOverMaxDays: null, ...over };
}

const codes = (f: Partial<LeavePolicyFacts>) =>
  checkLeavePolicy(facts(f), P).map((x) => x.code);

describe("accruedHalves", () => {
  it("upfront_full_year", () => {
    expect(accruedHalves(upfront(30), "2020-05-10", 2026, "2026-01-01"))
      .toBe(60);
  });
  it("upfront_pro_rata", () => {
    const p = upfront(30, true);
    expect(accruedHalves(p, "2026-04-01", 2026, "2026-04-01")).toBe(45);
    expect(accruedHalves(p, "2026-04-02", 2026, "2026-04-02")).toBe(40);
    expect(accruedHalves(p, "2027-01-01", 2026, "2026-12-31")).toBe(0);
    expect(accruedHalves(upfront(30), "2026-04-02", 2026, "2026-04-02"))
      .toBe(60);
  });
  it("monthly_credits_whole_months", () => {
    expect(accruedHalves(monthly(30), "2020-01-01", 2026, "2026-03-31"))
      .toBe(15);
    expect(accruedHalves(monthly(30), "2020-01-01", 2026, "2026-03-30"))
      .toBe(10);
    expect(accruedHalves(monthly(30), "2026-02-15", 2026, "2026-05-31"))
      .toBe(15);
    expect(accruedHalves(monthly(22), "2020-01-01", 2026, "2026-06-30"))
      .toBe(22);
  });
  it("monthly_year_end_and_later_asof", () => {
    expect(accruedHalves(monthly(30), "2020-01-01", 2026, "2027-02-01"))
      .toBe(60);
    expect(accruedHalves(monthly(30), "2020-01-01", 2026, "2025-12-31"))
      .toBe(0);
  });
  it("invalid_inputs_refused", () => {
    expect(() => accruedHalves(monthly(-1), "2020-01-01", 2026,
      "2026-03-31")).toThrow(expect.objectContaining({
      code: "INVALID_LEAVE_POLICY" }));
    expect(() => accruedHalves(monthly(30), "2020-02-30", 2026,
      "2026-03-31")).toThrow(expect.objectContaining({
      code: "INVALID_DATE" }));
  });
});

const BAL: BalanceInput = {
  accruedHalves: 60, carriedHalves: 10, carriedExpiresOn: "2026-03-31",
  adjustmentHalves: 0,
  taken: [{ date: "2026-02-10", halves: 4 }, { date: "2026-05-01",
    halves: 8 }],
  pendingHalves: 2, asOf: "2026-06-01",
};

describe("balanceHalves", () => {
  it("balance_carried_first_then_expires", () => {
    expect(balanceHalves(BAL)).toMatchObject({ takenHalves: 12,
      carriedUsedHalves: 4, expiredHalves: 6, availableHalves: 50 });
    const march = balanceHalves({ ...BAL, asOf: "2026-03-01" });
    expect(march.expiredHalves).toBe(0);
    expect(march.availableHalves).toBe(56);
  });
  it("carried_without_expiry_never_expires", () => {
    const r = balanceHalves({ ...BAL, carriedExpiresOn: null });
    expect(r.carriedUsedHalves).toBe(10);
    expect(r.expiredHalves).toBe(0);
  });
  it("carry_over_cap", () => {
    expect(carryOverHalves(-4, 10, P).carriedHalves).toBe(0);
    expect(carryOverHalves(7, 10, P).carriedHalves).toBe(7);
    expect(carryOverHalves(30, 10, P).carriedHalves).toBe(10);
  });
  it("excess_above_cap_returned_and_warned", () => {
    const r = carryOverHalves(30, 10, P);
    expect(r.excessHalves).toBe(20);
    expect(r.flags.map((f) => f.code)).toEqual(["UNUSED_LEAVE_NOT_CARRIED"]);
    const f = r.flags[0]!;
    expect(f.rule?.key).toBe("timeCarryOverMaxShareBps");
    expect(f.detail.excessHalves).toBe("20");
    expect(f.detail.note).toContain("cash");
    expect(f.detail.note).toContain("unsourced");
    expect(carryOverHalves(10, 10, P)).toEqual({ carriedHalves: 10,
      excessHalves: 0, flags: [] });
    expect(carryOverHalves(-4, 10, P).excessHalves).toBe(0);
  });
  it("carry_over_refuses_fractions", () => {
    expect(() => carryOverHalves(1.5, 10, P)).toThrow(
      expect.objectContaining({ code: "INVALID_HALVES" }));
    expect(() => carryOverHalves(5, -1, P)).toThrow(
      expect.objectContaining({ code: "INVALID_HALVES" }));
  });
  it("expired_carried_leave_warned_as_unsourced", () => {
    const r = balanceHalves(BAL);
    expect(r.flags.map((f) => f.code)).toEqual(["CARRIED_LEAVE_EXPIRED"]);
    expect(r.flags[0]!.rule).toBeNull();
    expect(r.flags[0]!.detail.expiredHalves).toBe("6");
    expect(r.flags[0]!.detail.note).toContain("not law");
    expect(balanceHalves({ ...BAL, asOf: "2026-03-01" }).flags).toEqual([]);
  });
  it("balance_refuses_bad_halves", () => {
    for (const bad of [{ pendingHalves: -1 }, { carriedHalves: 0.5 },
      { accruedHalves: -2 }, { adjustmentHalves: 0.5 },
      { taken: [{ date: "2026-02-10", halves: -1 }] }]) {
      expect(() => balanceHalves({ ...BAL, ...bad })).toThrow(
        expect.objectContaining({ code: "INVALID_HALVES" }));
    }
    expect(balanceHalves({ ...BAL, adjustmentHalves: -4 }).availableHalves)
      .toBe(46);
  });
  it("balance_identity", () => {
    const arbTaken = fc.array(fc.record({
      date: fc.constantFrom("2026-01-15", "2026-03-31", "2026-07-01"),
      halves: fc.integer({ min: 0, max: 20 }),
    }), { maxLength: 5 });
    const arb = fc.record({
      accruedHalves: fc.integer({ min: 0, max: 120 }),
      carriedHalves: fc.integer({ min: 0, max: 60 }),
      carriedExpiresOn: fc.constantFrom(null, "2026-03-31"),
      adjustmentHalves: fc.integer({ min: -20, max: 20 }),
      taken: arbTaken,
      pendingHalves: fc.integer({ min: 0, max: 20 }),
      asOf: fc.constantFrom("2026-02-01", "2026-04-01", "2026-12-31"),
    });
    fc.assert(fc.property(arb, (b) => {
      const r = balanceHalves(b);
      expect(r.availableHalves + r.takenHalves + b.pendingHalves +
        r.expiredHalves).toBe(b.accruedHalves + b.carriedHalves +
        b.adjustmentHalves);
    }));
  });
});

describe("checkLeavePolicy", () => {
  it("policy_warnings", () => {
    const below = checkLeavePolicy(facts({ annualDays: 22 }), P);
    expect(below.map((f) => f.code)).toEqual(["ANNUAL_BELOW_STATUTORY"]);
    expect(below[0]!.rule?.key).toBe("timeAnnualLeaveMinDays");
    expect(codes({ annualDays: 22, dayCount: "working" }))
      .toEqual(["ANNUAL_BASIS_NOT_COMPARED"]);
    expect(codes({ annualDays: 20, accrual: "monthly" })).toEqual([
      "ANNUAL_BELOW_STATUTORY", "MONTHLY_BELOW_FIRST_YEAR_RATE"]);
    expect(codes({ carryOverMaxDays: 16 }))
      .toEqual(["CARRY_OVER_ABOVE_HALF"]);
    expect(codes({ carryOverMaxDays: 15 })).toEqual([]);
    expect(codes({ payrollKind: "sick", annualDays: 60 }))
      .toEqual(["SICK_DAYS_DIFFER_FROM_LAW"]);
    expect(codes({ payrollKind: "maternity", annualDays: 60 }))
      .toEqual(["MATERNITY_IS_PER_BIRTH"]);
    expect(codes({})).toEqual([]);
  });
  it("every_warning_carries_its_rule", () => {
    const all = [
      ...checkLeavePolicy(facts({ annualDays: 20, accrual: "monthly",
        carryOverMaxDays: 16 }), P),
      ...checkLeavePolicy(facts({ dayCount: "working" }), P),
      ...checkLeavePolicy(facts({ payrollKind: "sick", annualDays: 1 }), P),
      ...checkLeavePolicy(facts({ payrollKind: "maternity" }), P),
    ];
    expect(all.length).toBe(6);
    for (const f of all) expect(f.rule, f.code).not.toBeNull();
  });
  it("monthly_rate_not_compared_on_working_basis", () => {
    expect(codes({ annualDays: 20, accrual: "monthly",
      dayCount: "working" })).toEqual(["ANNUAL_BASIS_NOT_COMPARED"]);
  });
  it("null_annual_days_compares_nothing", () => {
    expect(codes({ annualDays: null, carryOverMaxDays: 5 })).toEqual([]);
    expect(codes({ payrollKind: "sick", annualDays: null })).toEqual([]);
  });
});
