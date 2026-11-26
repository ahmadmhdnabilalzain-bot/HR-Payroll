import { describe, expect, it } from "vitest";
import { loadGpssaParams, loadPayrollParams } from "../src/payroll/params";
import { GPSSA_PACKS } from "../src/rules/gpssa-pack";
import { PAYROLL_PACKS } from "../src/rules/payroll-pack";
import { selectPack } from "../src/rules/select";
import type { RulePack } from "../src/rules/types";
import { sourceOf } from "../src/sources";

const PAY = PAYROLL_PACKS[0]!;
const GP = GPSSA_PACKS[0]!;

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

function detailOf(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (e) {
    return (e as { detail: Record<string, string> }).detail;
  }
  return {};
}

const params = (p: RulePack) => Object.entries(p.params);

describe("payroll and GPSSA packs", () => {
  it("freezes both packs", () => {
    expect(Object.isFrozen(PAY.params.overtimeUpliftBps)).toBe(true);
    expect(Object.isFrozen(GP.params.gpssaDl57EmployeeBps)).toBe(true);
    expect(Object.isFrozen(PAYROLL_PACKS)).toBe(true);
  });
  it("cites an article for every official param", () => {
    const official = [...params(PAY), ...params(GP)]
      .filter(([, p]) => p.status === "official");
    expect(official.length).toBeGreaterThan(30);
    for (const [key, p] of official) {
      expect(p.source?.note, key).toMatch(/Article \d/);
      expect(p.source?.url.startsWith(
        "https://uaelegislation.gov.ae/en/legislations/"), key).toBe(true);
    }
  });
  it("keeps unsourced params empty", () => {
    for (const key of ["gpssaContributionSalaryBase",
      "gpssaGccNationalContribution"]) {
      expect(GP.params[key]).toEqual({ value: null, source: null,
        status: "unsourced" });
    }
  });
  it("uses keys unique across the two packs", () => {
    const gp = new Set(Object.keys(GP.params));
    expect(Object.keys(PAY.params).filter((k) => gp.has(k))).toEqual([]);
  });
  it("loads the official overtime values", () => {
    const p = loadPayrollParams(PAY, undefined);
    expect(p.overtimeUpliftBps.v).toBe(2500n);
    expect(p.nightOvertimeUpliftBps.v).toBe(5000n);
    expect(p.overtimeUpliftBps.rule.status).toBe("official");
    expect(p.deductionOrder.v).toBe(
      "gpssa,court-debt,overpayment,violation,damage,scheme,loan");
    expect(p.capRoundingMode.v).toBe("DOWN");
  });
  it("refuses GPSSA without a salary base", () => {
    const fn = () => loadGpssaParams(GP, undefined, "dl57-2023");
    expect(codeOf(fn)).toBe("UNSOURCED_PARAM");
    expect(detailOf(fn).key).toBe("gpssaContributionSalaryBase");
  });
  it("loads each regime with an override", () => {
    const ov = { gpssaContributionSalaryBase: "basic" };
    const dl = loadGpssaParams(GP, ov, "dl57-2023");
    expect(dl.regime).toBe("dl57-2023");
    expect(dl.employeeBps.v).toBe(1100n);
    expect(dl.govSupportBelow?.v).toBe(2000000n);
    expect(dl.base.v).toBe("basic");
    expect(dl.base.rule.overridden).toBe(true);
    expect(dl.lastMonth.v).toBe("full-month");
    const l7 = loadGpssaParams(GP, ov, "law7-1999");
    expect(l7.employeeBps.v).toBe(500n);
    expect(l7.minSalary.v).toBe(100000n);
    expect(l7.govSupportBelow).toBeNull();
    expect(l7.lastMonth.v).toBe("none-if-partial");
  });
  it("refuses a choice outside the list", () => {
    expect(codeOf(() => loadPayrollParams(PAY,
      { restDayPayMode: "double" }))).toBe("INVALID_PARAM");
    expect(codeOf(() => loadGpssaParams(GP,
      { gpssaContributionSalaryBase: "gross" }, "dl57-2023")))
      .toBe("INVALID_PARAM");
    expect(codeOf(() => loadPayrollParams(PAY,
      { roundingMode: "NEAREST" }))).toBe("INVALID_PARAM");
  });
  it("has no GPSSA pack before Decree-Law 57", () => {
    expect(codeOf(() => selectPack(GPSSA_PACKS, "2023-10-01")))
      .toBe("NO_PACK_FOR_DATE");
    expect(selectPack(GPSSA_PACKS, "2023-10-31").id).toBe("ae-gpssa");
    expect(selectPack(PAYROLL_PACKS, "2022-03-01").id).toBe("ae-payroll");
  });
  it("names the article in the source note", () => {
    expect(sourceOf("DL57_ART4").note).toContain("Article 4");
    expect(sourceOf("DL33_ART19").url).toBe(
      "https://uaelegislation.gov.ae/en/legislations/1541");
  });
});
