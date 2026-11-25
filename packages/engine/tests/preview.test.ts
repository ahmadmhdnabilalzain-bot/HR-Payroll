import { describe, expect, it } from "vitest";
import type { GratuityInput } from "../src/gratuity";
import { fils } from "../src/money";
import { previewRuleChange } from "../src/preview";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";
import type { RulePack } from "../src/rules/types";
import type { SettlementInput } from "../src/settlement";

const gratuity: GratuityInput = {
  joiningDate: "2019-01-01",
  lastWorkingDate: "2023-12-31",
  unpaidLeaveDays: 0,
  lastBasicMonthly: fils(1000000n),
  workerClass: "expat-full-time",
};
const input: SettlementInput = { gratuity, unusedLeaveDays: 10 };
const first = (): RulePack => {
  const pack = GRATUITY_PACKS[0];
  if (!pack) throw new Error("no pack");
  return pack;
};
const packId = first().id;
const change = { packId, key: "tier1DaysPerYear", newValue: 22 };
const code = (c: string) => expect.objectContaining({ code: c });

describe("previewRuleChange", () => {
  it("raising tier1 from 21 to 22 adds 166667 fils", () => {
    const p = previewRuleChange(input, GRATUITY_PACKS, change);
    expect(p.delta).toBe(166667n);
    expect(p.after.value.total - p.before.value.total).toBe(166667n);
    expect(p.hypothetical).toBe(true);
  });
  it("after-trace shows the hypothetical rule", () => {
    const p = previewRuleChange(input, GRATUITY_PACKS, change);
    const rules = p.after.trace.flatMap((l) => l.rules);
    const r = rules.find((x) => x.key === "tier1DaysPerYear");
    expect(r?.status).toBe("hypothetical");
    expect(r?.value).toBe("22");
    const b = p.before.trace.flatMap((l) => l.rules)
      .find((x) => x.key === "tier1DaysPerYear");
    expect(b?.status).toBe("official");
  });
  it("never mutates the original packs", () => {
    const pack = first();
    const param = pack.params.tier1DaysPerYear;
    if (!param) throw new Error("no param");
    previewRuleChange(input, GRATUITY_PACKS, change);
    expect(first()).toBe(pack);
    expect(pack.params.tier1DaysPerYear).toBe(param);
    expect(param.value).toBe(21);
    expect(param.status).toBe("official");
    expect(Object.isFrozen(pack)).toBe(false);
    expect(Object.isFrozen(param)).toBe(false);
  });
  it("rejects an unknown pack id", () => {
    expect(() => previewRuleChange(input, GRATUITY_PACKS,
      { ...change, packId: "nope" })).toThrow(code("MISSING_PACK"));
  });
  it("rejects an unknown or inherited key", () => {
    expect(() => previewRuleChange(input, GRATUITY_PACKS,
      { ...change, key: "nope" })).toThrow(code("MISSING_PARAM"));
    expect(() => previewRuleChange(input, GRATUITY_PACKS,
      { ...change, key: "toString" })).toThrow(code("MISSING_PARAM"));
  });
});
