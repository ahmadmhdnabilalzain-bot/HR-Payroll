import { describe, expect, it } from "vitest";
import {
  calculateGratuity,
  type GratuityInput,
  type WorkerClass,
} from "../src/gratuity";
import { fils } from "../src/money";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";
import type { ParamValue, RulePack } from "../src/rules/types";
import { sourceOf } from "../src/sources";

const AED_10K = fils(1000000n);
const code = (c: string) => expect.objectContaining({ code: c });

function input(
  joiningDate: string,
  lastWorkingDate: string,
  more: Partial<GratuityInput> = {},
): GratuityInput {
  return {
    joiningDate,
    lastWorkingDate,
    unpaidLeaveDays: 0,
    lastBasicMonthly: AED_10K,
    workerClass: "expat-full-time",
    ...more,
  };
}

function run(
  i: GratuityInput,
  overrides?: Record<string, ParamValue>,
  packs: RulePack[] = GRATUITY_PACKS,
) {
  return overrides === undefined
    ? calculateGratuity(i, packs)
    : calculateGratuity(i, packs, overrides);
}

const ids = (r: ReturnType<typeof run>) => r.trace.map((l) => l.id);
const line = (r: ReturnType<typeof run>, id: string) =>
  r.trace.find((l) => l.id === id);
const ELIGIBLE_IDS = ["service.days", "service.years", "gratuity.tier1",
  "gratuity.tier2", "gratuity.cap", "gratuity.total"];
const NOT_ELIGIBLE_IDS = ["service.days", "service.years", "gratuity.total"];

describe("GRATUITY_PACKS", () => {
  const pack = GRATUITY_PACKS[0]!;
  it("is the ae-gratuity pack from 2022-02-02", () => {
    expect(GRATUITY_PACKS).toHaveLength(1);
    expect(pack).toMatchObject({ id: "ae-gratuity", version: "2022-02-02",
      effectiveFrom: "2022-02-02", effectiveTo: null });
  });
  it("carries statuses and registry sources", () => {
    expect(pack.params["tier1DaysPerYear"]).toEqual({ value: 21,
      status: "official", source: sourceOf("LAW_33_2021") });
    expect(pack.params["capBase"]).toEqual({ value: "basic",
      status: "secondary", source: sourceOf("X0PA_EOSB_CALC") });
    expect(pack.params["yearDayCount"]).toEqual({ value: 365,
      status: "convention", source: sourceOf("ENGINE_CONVENTION") });
    expect(pack.params["gccNationalGratuity"]).toEqual({ value: null,
      status: "unsourced", source: null });
    expect(Object.keys(pack.params)).toHaveLength(16);
  });
});

describe("calculateGratuity: sourced and hand-derived cases", () => {
  it("five years with a leap day: 3500000n", () => {
    const r = run(input("2019-01-01", "2023-12-31"));
    expect(r.value).toMatchObject({ amount: 3500000n, eligible: true,
      completedYears: 5, leftoverDays: 0 });
    expect(ids(r)).toEqual(ELIGIBLE_IDS);
  });
  it("seven years uses tier 2: 5500000n", () => {
    const r = run(input("2017-01-01", "2023-12-31"));
    expect(r.value).toMatchObject({ amount: 5500000n, completedYears: 7 });
  });
  it("exactly one year ending on a leap day is eligible", () => {
    const r = run(input("2023-03-01", "2024-02-29"));
    expect(r.value).toMatchObject({ amount: 700000n, eligible: true,
      completedYears: 1, leftoverDays: 0 });
  });
  it("one day short of a year is not eligible", () => {
    const r = run(input("2023-03-01", "2024-02-28"));
    expect(r.value).toMatchObject({ amount: 0n, eligible: false,
      completedYears: 0, leftoverDays: 365 });
    expect(ids(r)).toEqual(NOT_ELIGIBLE_IDS);
  });
  it("leap-day joiner reaches the 28 February anniversary", () => {
    const r = run(input("2024-02-29", "2025-02-27"));
    expect(r.value).toMatchObject({ eligible: true, completedYears: 1,
      leftoverDays: 0, amount: 700000n });
    const years = line(r, "service.years")!;
    expect(years.inputs["lastAnniversary"]).toBe("2025-02-28");
    expect(years.formula).toMatch(/29 February/);
  });
  it("part year pro rata: 2 years and 183/365 gives 1750959n", () => {
    const r = run(input("2022-01-01", "2024-07-01"));
    expect(r.value).toMatchObject({ amount: 1750959n, completedYears: 2,
      leftoverDays: 183 });
    const tier1 = line(r, "gratuity.tier1")!;
    expect(tier1.rules.map((x) => x.key)).toContain("partYearProRata");
  });
  it("cap: 30 years in range is capped at 24000000n", () => {
    const r = run(input("1994-01-01", "2023-12-31"));
    expect(r.value).toMatchObject({ amount: 24000000n, completedYears: 30 });
    const cap = line(r, "gratuity.cap")!;
    expect(cap.inputs["capApplied"]).toBe("true");
    expect(cap.result).toBe("24000000");
  });
  it("cap: the brief's 1990 to 2019 case with an earlier pack", () => {
    const early = { ...GRATUITY_PACKS[0]!, effectiveFrom: "1980-01-01" };
    const r = run(input("1990-01-01", "2019-12-31"), undefined, [early]);
    expect(r.value.amount).toBe(24000000n);
    expect(line(r, "gratuity.cap")!.inputs["capApplied"]).toBe("true");
  });
  it("cap not applied is stated too", () => {
    const r = run(input("2019-01-01", "2023-12-31"));
    expect(line(r, "gratuity.cap")!.inputs["capApplied"]).toBe("false");
  });
  it("unpaid leave pushes service below one year", () => {
    expect(run(input("2023-03-01", "2024-03-10")).value.eligible)
      .toBe(true);
    const r = run(input("2023-03-01", "2024-03-10",
      { unpaidLeaveDays: 20 }));
    expect(r.value).toMatchObject({ eligible: false, amount: 0n });
    expect(line(r, "service.days")!.inputs["unpaidLeaveDays"]).toBe("20");
  });
});

describe("calculateGratuity: worker classes", () => {
  it("uae-national is not eligible, naming pension legislation", () => {
    const r = run(input("2019-01-01", "2023-12-31",
      { workerClass: "uae-national" }));
    expect(r.value.eligible).toBe(false);
    expect(r.value.amount).toBe(0n);
    expect(r.value.reason).toMatch(/pension/i);
    expect(ids(r)).toEqual(NOT_ELIGIBLE_IDS);
    expect(line(r, "gratuity.total")!.inputs["reason"]).toMatch(/pension/i);
  });
  it("gcc-national throws UNSOURCED_PARAM for gccNationalGratuity", () => {
    const i = input("2019-01-01", "2023-12-31",
      { workerClass: "gcc-national" });
    expect(() => run(i)).toThrowError(expect.objectContaining({
      code: "UNSOURCED_PARAM", detail: expect.objectContaining({
        key: "gccNationalGratuity" }) }));
  });
  it("gcc-national with an override still refuses to guess", () => {
    const i = input("2019-01-01", "2023-12-31",
      { workerClass: "gcc-national" });
    expect(() => run(i, { gccNationalGratuity: "x" })).toThrowError(
      code("UNSUPPORTED_WORKER_CLASS"));
  });
  it("an unknown worker class throws", () => {
    const i = input("2019-01-01", "2023-12-31",
      { workerClass: "intern" as WorkerClass });
    expect(() => run(i)).toThrowError(code("UNSUPPORTED_WORKER_CLASS"));
  });
});

describe("calculateGratuity: review focus edge cases", () => {
  it("last working date before joining: INVALID_DATE_RANGE", () => {
    expect(() => run(input("2023-05-02", "2023-05-01"))).toThrowError(
      code("INVALID_DATE_RANGE"));
  });
  it("same day: not eligible, zero, no crash", () => {
    const r = run(input("2023-05-01", "2023-05-01"));
    expect(r.value).toMatchObject({ eligible: false, amount: 0n,
      completedYears: 0, leftoverDays: 1 });
  });
  it("unpaid days beyond total days: INVALID_UNPAID_DAYS", () => {
    const i = (n: number) =>
      input("2023-01-01", "2023-01-10", { unpaidLeaveDays: n });
    expect(run(i(10)).value.leftoverDays).toBe(0);
    for (const n of [11, -1, 1.5, Number.NaN]) {
      expect(() => run(i(n))).toThrowError(code("INVALID_UNPAID_DAYS"));
    }
  });
  it("impossible dates: INVALID_DATE", () => {
    expect(() => run(input("2019-01-01", "2024-02-30"))).toThrowError(
      code("INVALID_DATE"));
    expect(() => run(input("2019-1-1", "2024-02-01"))).toThrowError(
      code("INVALID_DATE"));
  });
  it("zero or negative basic: INVALID_AMOUNT", () => {
    for (const b of [0n, -100n]) {
      const i = input("2019-01-01", "2023-12-31",
        { lastBasicMonthly: fils(b) });
      expect(() => run(i)).toThrowError(code("INVALID_AMOUNT"));
    }
  });
  it("no pack for an old leaving date: NO_PACK_FOR_DATE", () => {
    expect(() => run(input("2010-01-01", "2019-12-31"))).toThrowError(
      code("NO_PACK_FOR_DATE"));
  });
});

describe("calculateGratuity: overrides and determinism", () => {
  const five = input("2019-01-01", "2023-12-31");
  it("dailyWageDivisor 365 changes the amount and is traced", () => {
    const r = run(five, { dailyWageDivisor: 365 });
    expect(r.value.amount).toBe(287671n);
    const rules = r.trace.flatMap((l) => l.rules)
      .filter((x) => x.key === "dailyWageDivisor");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((x) => x.overridden && x.value === "365"))
      .toBe(true);
  });
  it("partYearProRata false drops the part year", () => {
    const r = run(input("2022-01-01", "2024-07-01"),
      { partYearProRata: false });
    expect(r.value.amount).toBe(1400000n);
  });
  it("rejects badly typed overrides with INVALID_PARAM", () => {
    const bad: Record<string, ParamValue>[] = [{ dailyWageDivisor: 0 },
      { dailyWageDivisor: 1.5 }, { dailyWageDivisor: "30" },
      { roundingMode: "NEAREST" }, { partYearProRata: "yes" },
      { capBase: "total" }];
    for (const o of bad) {
      expect(() => run(five, o)).toThrowError(code("INVALID_PARAM"));
    }
  });
  it("the same input twice gives deep-equal results", () => {
    expect(run(five)).toEqual(run(five));
    expect(run(five).value.reason).not.toBe("");
  });
});
