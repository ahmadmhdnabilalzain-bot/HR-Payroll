import { describe, expect, it } from "vitest";
import type { GratuityInput } from "../src/gratuity";
import { fils } from "../src/money";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";
import { calculateSettlement } from "../src/settlement";

const gratuity = (more: Partial<GratuityInput> = {}): GratuityInput => ({
  joiningDate: "2019-01-01",
  lastWorkingDate: "2023-12-31",
  unpaidLeaveDays: 0,
  lastBasicMonthly: fils(1000000n),
  workerClass: "expat-full-time",
  ...more,
});
const run = (days: number, more: Partial<GratuityInput> = {}) =>
  calculateSettlement({ gratuity: gratuity(more), unusedLeaveDays: days },
    GRATUITY_PACKS);
const code = (c: string) => expect.objectContaining({ code: c });

describe("calculateSettlement", () => {
  it("five-year case with 10 unused days", () => {
    const r = run(10);
    expect(r.value.gratuity).toBe(3500000n);
    expect(r.value.leavePay).toBe(333333n);
    expect(r.value.total).toBe(3833333n);
  });
  it("lists what is not computed", () => {
    expect(run(10).value.notComputed).toEqual(
      ["notice pay", "deductions", "other dues"]);
  });
  it("rejects negative or fractional leave days", () => {
    expect(() => run(-1)).toThrow(code("INVALID_LEAVE_DAYS"));
    expect(() => run(1.5)).toThrow(code("INVALID_LEAVE_DAYS"));
  });
  it("traces gratuity.total, leave.pay, settlement.total in order", () => {
    const ids = run(10).trace.map((l) => l.id);
    expect(ids).toEqual(["service.days", "service.years",
      "gratuity.tier1", "gratuity.tier2", "gratuity.cap", "gratuity.total",
      "leave.pay", "settlement.total"]);
  });
  it("national: no gratuity, leave pay still computed", () => {
    const r = run(10, { workerClass: "uae-national" });
    expect(r.value.gratuity).toBe(0n);
    expect(r.value.leavePay).toBe(333333n);
    expect(r.value.total).toBe(333333n);
  });
  it("zero leave days gives zero leave pay", () => {
    expect(run(0).value.leavePay).toBe(0n);
  });
  it("refuses a non-basic leave pay base", () => {
    const o = { leavePayBase: "gross" };
    expect(() => calculateSettlement(
      { gratuity: gratuity(), unusedLeaveDays: 1 }, GRATUITY_PACKS, o))
      .toThrow(code("INVALID_PARAM"));
  });
});
