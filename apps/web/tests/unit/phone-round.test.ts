import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { wordOfRoute } from "../../src/nav/registry";
import { problemOf, yearsBetween } from "../../src/timeoff/draft";

const data = buildDemoData();
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });

describe("the phone bar lights the right word", () => {
  it("the manager's hiring form belongs to Requests, not Pay", () => {
    const c = { data, state: as("manager") };
    expect(wordOfRoute("manager", { section: "people",
      rest: ["hiring", "requests", "new"] }, c)).toBe("requests");
  });
});

describe("every leave type can be asked for, with its rule", () => {
  const P = data.people;
  const types = P.leaveTypes();
  const none = { halves: 0, weekendDays: 0, holidayDays: 0 };
  const count = (a: string, b: string) => P.countDays(a, b) ?? none;
  const rule = (id: string) => types.find((x) => x.id === id)!.rule;

  it("offers annual, sick, maternity, parental, bereavement, study, unpaid",
    () => {
      expect(types.map((x) => x.id)).toEqual(["lt-annual", "lt-sick",
        "lt-maternity", "lt-parental", "lt-bereavement", "lt-study",
        "lt-unpaid"]);
      for (const x of types) {
        expect(x.rule.text.en.length).toBeGreaterThan(10);
        expect(x.rule.source.en).not.toBe("");
      }
    });

  it("reads sick and maternity figures from the payroll rule pack", () => {
    expect(rule("lt-sick").text.en).toContain("first 15 on full pay");
    expect(rule("lt-sick").maxDays).toBe(90);
    expect(rule("lt-maternity").maxDays).toBe(60);
    expect(rule("lt-maternity").text.en).toContain("next 15 on half pay");
  });

  it("holds Send until the proof is added, and checks the most days", () => {
    const base = (id: Parameters<typeof problemOf>[0], a: string, b: string,
      proofAdded: boolean) => problemOf(id, a, b, count(a, b), null, [],
      { rule: rule(id), serviceYears: 5, proofAdded });
    expect(base("lt-sick", "2026-11-02", "2026-11-03", false))
      .toBe("errProof");
    expect(base("lt-sick", "2026-11-02", "2026-11-03", true)).toBeNull();
    expect(base("lt-bereavement", "2026-11-09", "2026-11-14", true))
      .toBe("errMax");
    expect(base("lt-parental", "2026-11-23", "2026-11-27", true))
      .toBeNull();
    expect(base("lt-maternity", "2026-11-01", "2026-12-31", true))
      .toBe("errMax");
  });

  it("study leave waits for two years with the company", () => {
    expect(problemOf("lt-study", "2026-11-30", "2026-11-30",
      count("2026-11-30", "2026-11-30"), null, [],
      { rule: rule("lt-study"), serviceYears: 1, proofAdded: true }))
      .toBe("errService");
    expect(yearsBetween("2024-11-01", "2026-10-31")).toBe(1);
    expect(yearsBetween("2024-10-27", "2026-10-27")).toBe(2);
  });
});

