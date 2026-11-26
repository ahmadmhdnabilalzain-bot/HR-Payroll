import { describe, expect, it } from "vitest";
import {
  computeCorporateTax,
  fils,
  type CtInput,
} from "../src/index";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

function ct(profit: bigint, over: Partial<CtInput> = {}): CtInput {
  return {
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    accountingProfit: fils(profit),
    adjustments: [],
    revenue: fils(200000000n),
    sbr: { elected: false, revenueWithinThresholdInPriorPeriods: null,
      qualifyingFreeZoneOrMneMember: null },
    ...over,
  };
}

const ELECTED = { elected: true, revenueWithinThresholdInPriorPeriods:
  true, qualifyingFreeZoneOrMneMember: false };

describe("corporate tax worksheet", () => {
  it("below_band_zero_tax", () => {
    const r = computeCorporateTax(ct(30000000n)).value;
    expect(r.taxableIncome).toBe(30000000n);
    expect(r.zeroBandPortion).toBe(30000000n);
    expect(r.mainBandPortion).toBe(0n);
    expect(r.taxBeforeRelief).toBe(0n);
    expect(r.sbr.status).toBe("not-elected");
    expect(r.taxAfterRelief).toBe(0n);
  });
  it("above_band_nine_hundred_bps", () => {
    const r = computeCorporateTax(ct(47500000n)).value;
    expect(r.zeroBandPortion).toBe(37500000n);
    expect(r.mainBandPortion).toBe(10000000n);
    expect(r.taxBeforeRelief).toBe(900000n);
  });
  it("adjustments_apply", () => {
    const r = computeCorporateTax(ct(40000000n, { adjustments: [
      { label: "fines", amount: fils(5000000n), effect: "add" },
      { label: "exempt income", amount: fils(2500000n),
        effect: "deduct" },
    ] })).value;
    expect(r.taxableIncome).toBe(42500000n);
    expect(codeOf(() => computeCorporateTax(ct(1n, { adjustments: [
      { label: "x", amount: fils(-1n), effect: "add" }] }))))
      .toBe("INVALID_AMOUNT");
  });
  it("loss_period", () => {
    const r = computeCorporateTax(ct(-1000000n)).value;
    expect(r.taxableIncome).toBe(0n);
    expect(r.periodLoss).toBe(1000000n);
    expect(r.taxBeforeRelief).toBe(0n);
  });
  it("sbr_end_unsourced_not_assessed", () => {
    const r = computeCorporateTax(ct(47500000n, { sbr: ELECTED })).value;
    expect(r.sbr.status).toBe("not-assessed");
    expect(r.sbr.reasons).toEqual(["SBR_END_DATE_UNSOURCED"]);
    expect(r.taxAfterRelief).toBeNull();
    const line = computeCorporateTax(ct(1n, { sbr: ELECTED })).trace
      .find((l) => l.id === "ct.sbr")!;
    expect(line.rules.find((x) => x.key === "sbrLastPeriodEnd"))
      .toMatchObject({ status: "unsourced", value: "null" });
  });
  it("sbr_with_override_met", () => {
    const r = computeCorporateTax(ct(47500000n, { sbr: ELECTED,
      overrides: { sbrLastPeriodEnd: "2029-12-31" } }));
    expect(r.value.sbr.status).toBe("conditions-met");
    expect(r.value.taxAfterRelief).toBe(0n);
    const line = r.trace.find((l) => l.id === "ct.sbr")!;
    expect(line.rules.find((x) => x.key === "sbrLastPeriodEnd"))
      .toMatchObject({ overridden: true, value: "2029-12-31" });
  });
  it("sbr_override_before_period_end_not_met", () => {
    const r = computeCorporateTax(ct(47500000n, { sbr: ELECTED,
      overrides: { sbrLastPeriodEnd: "2025-12-31" } })).value;
    expect(r.sbr.status).toBe("condition-not-met");
    expect(r.taxAfterRelief).toBe(900000n);
  });
  it("sbr_revenue_over_threshold", () => {
    const r = computeCorporateTax(ct(47500000n, { sbr: ELECTED,
      revenue: fils(300000001n) })).value;
    expect(r.sbr.status).toBe("condition-not-met");
    expect(r.sbr.reasons).toEqual(["REVENUE_OVER_THRESHOLD"]);
    expect(r.taxAfterRelief).toBe(r.taxBeforeRelief);
    const at = computeCorporateTax(ct(47500000n, { sbr: ELECTED,
      revenue: fils(300000000n), overrides: {
        sbrLastPeriodEnd: "2029-12-31" } })).value;
    expect(at.sbr.status).toBe("conditions-met");
  });
  it("sbr_mne_member_not_met", () => {
    const r = computeCorporateTax(ct(47500000n, { sbr: { ...ELECTED,
      qualifyingFreeZoneOrMneMember: true,
      revenueWithinThresholdInPriorPeriods: false } })).value;
    expect(r.sbr.status).toBe("condition-not-met");
    expect(r.sbr.reasons).toEqual(["PRIOR_PERIOD_REVENUE_OVER_THRESHOLD",
      "QUALIFYING_FREE_ZONE_OR_MNE_MEMBER"]);
    expect(r.taxAfterRelief).toBe(900000n);
  });
  it("sbr_null_attestation_not_assessed", () => {
    const r = computeCorporateTax(ct(47500000n, { sbr: { ...ELECTED,
      qualifyingFreeZoneOrMneMember: null }, overrides: {
        sbrLastPeriodEnd: "2029-12-31" } })).value;
    expect(r.sbr.status).toBe("not-assessed");
    expect(r.sbr.reasons).toEqual(["FREE_ZONE_OR_MNE_NOT_ENTERED"]);
    expect(r.taxAfterRelief).toBeNull();
  });
  it("due_date_nine_months", () => {
    expect(computeCorporateTax(ct(1n)).value.dueDate).toBe("2027-09-30");
  });
  it("pack_before_2026_refused", () => {
    expect(codeOf(() => computeCorporateTax(ct(1n, {
      periodStart: "2025-01-01", periodEnd: "2025-12-31" }))))
      .toBe("NO_PACK_FOR_DATE");
  });
  it("period_limits", () => {
    expect(codeOf(() => computeCorporateTax(ct(1n, {
      periodStart: "2026-12-31", periodEnd: "2026-12-31" }))))
      .toBe("INVALID_PERIOD");
    expect(computeCorporateTax(ct(1n, { periodStart: "2025-07-01",
      periodEnd: "2026-12-31" })).value.dueDate).toBe("2027-09-30");
    expect(codeOf(() => computeCorporateTax(ct(1n, {
      periodStart: "2025-06-30", periodEnd: "2026-12-31" }))))
      .toBe("INVALID_PERIOD");
  });
  it("rates_secondary_in_trace", () => {
    const r = computeCorporateTax(ct(47500000n));
    const rules = r.trace.flatMap((l) => l.rules);
    for (const key of ["zeroBandUpperFils", "mainRateBps"]) {
      expect(rules.find((x) => x.key === key)!.status).toBe("secondary");
    }
    expect(r.trace.map((l) => l.id)).toEqual(["ct.taxable-income",
      "ct.zero-band", "ct.main-band", "ct.sbr", "ct.due-date"]);
    expect(r.value.notComputed).toHaveLength(4);
  });
});
