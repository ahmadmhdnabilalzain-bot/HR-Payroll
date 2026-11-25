import { describe, expect, it } from "vitest";
import { MESSAGES, STATUS_WORDS } from "../src/explain/catalog";
import { deepFreeze } from "../src/freeze";
import type { GratuityInput } from "../src/gratuity";
import { fils } from "../src/money";
import { previewRuleChange } from "../src/preview";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";
import { requireParam } from "../src/rules/select";
import type { RuleParam, RulePack } from "../src/rules/types";
import { calculateSettlement } from "../src/settlement";
import { SOURCES } from "../src/sources";

const gratuity: GratuityInput = {
  joiningDate: "2019-01-01",
  lastWorkingDate: "2023-12-31",
  unpaidLeaveDays: 0,
  lastBasicMonthly: fils(1000000n),
  workerClass: "expat-full-time",
};
const input = { gratuity, unusedLeaveDays: 10 };
const total = () => calculateSettlement(input, GRATUITY_PACKS).value.total;
const pack = () => GRATUITY_PACKS[0]!;

describe("deepFreeze", () => {
  it("freezes nested objects and arrays and returns its argument", () => {
    const o = { a: { b: [1, { c: 2 }] } };
    expect(deepFreeze(o)).toBe(o);
    expect(Object.isFrozen(o.a.b)).toBe(true);
    expect(Object.isFrozen(o.a.b[1])).toBe(true);
  });
});

describe("shared data cannot be changed by callers", () => {
  it("requireParam returns a copy of the source", () => {
    const before = SOURCES["LAW_33_2021"]!.url;
    const r = requireParam(pack(), "tier1DaysPerYear");
    r.source!.url = "HACKED";
    expect(SOURCES["LAW_33_2021"]!.url).toBe(before);
    expect(requireParam(pack(), "tier1DaysPerYear").source!.url)
      .toBe(before);
  });
  it("SOURCES and each source are frozen", () => {
    expect(() => {
      SOURCES["LAW_33_2021"]!.url = "HACKED";
    }).toThrow(TypeError);
    expect(() => {
      SOURCES["NEW"] = { url: "", note: "x" };
    }).toThrow(TypeError);
  });
  it("assigning into GRATUITY_PACKS throws and the total holds", () => {
    expect(total()).toBe(3833333n);
    const params = pack().params as Record<string, RuleParam>;
    expect(() => {
      params["tier1DaysPerYear"]!.value = 30;
    }).toThrow(TypeError);
    expect(() => {
      params["extra"] = { value: 1, status: "official", source: null };
    }).toThrow(TypeError);
    expect(() => {
      params["tier1DaysPerYear"]!.source!.url = "HACKED";
    }).toThrow(TypeError);
    const list = GRATUITY_PACKS as RulePack[];
    expect(() => list.push(pack())).toThrow(TypeError);
    expect(total()).toBe(3833333n);
  });
  it("MESSAGES and STATUS_WORDS are frozen", () => {
    expect(() => {
      MESSAGES.en["gratuity.total"] = "HACKED {result}";
    }).toThrow(TypeError);
    expect(() => {
      STATUS_WORDS.en["official"] = "HACKED";
    }).toThrow(TypeError);
    expect(MESSAGES.en["gratuity.total"]).not.toContain("HACKED");
  });
});

describe("preview copies", () => {
  const change = { packId: "ae-gratuity", key: "tier1DaysPerYear",
    newValue: 22 };
  it("leaves the shared HYPOTHETICAL source frozen and intact", () => {
    const p = previewRuleChange(input, GRATUITY_PACKS, change);
    expect(p.delta).toBe(166667n);
    expect(SOURCES["HYPOTHETICAL"]!.note).toMatch(/hypothetical/);
    expect(Object.isFrozen(SOURCES["HYPOTHETICAL"])).toBe(true);
  });
  it("other rules keep their status in the after trace", () => {
    const p = previewRuleChange(input, GRATUITY_PACKS, change);
    const rules = p.after.trace.flatMap((l) => l.rules);
    const hypo = rules.filter((r) => r.status === "hypothetical");
    expect(new Set(hypo.map((r) => r.key))).toEqual(
      new Set(["tier1DaysPerYear"]));
    const tier2 = rules.find((r) => r.key === "tier2DaysPerYear");
    expect(tier2?.status).toBe("official");
  });
});
