import { ruleChange } from "@payroll/demo-data";
import { describe, expect, it } from "vitest";
import {
  reduceRuleChange,
  RULE_CHANGE_ID,
  RULE_CHANGE_INITIAL,
  ruleChangeWaiting,
  stageOf,
  type RuleChangeStep,
} from "../../src/setup/rule-change/state";

const step = (verdict: "plan" | "hold", role: "hr" | "gm")
  : RuleChangeStep => ({ changeId: RULE_CHANGE_ID, verdict, role,
  who: role === "hr" ? "HR person" : "GM person", title: role,
  on: "2026-10-27" });

describe("WP28 rule-change decisions", () => {
  it("the id matches the data's one pending change", () => {
    expect(RULE_CHANGE_ID).toBe(ruleChange().id);
  });

  it("HR first, then the General manager; undo removes the latest", () => {
    let s = RULE_CHANGE_INITIAL;
    expect(stageOf(s.ruleChangeSteps, RULE_CHANGE_ID).kind)
      .toBe("waiting-hr");
    expect(ruleChangeWaiting(s.ruleChangeSteps, RULE_CHANGE_ID, "hr"))
      .toBe(1);
    expect(ruleChangeWaiting(s.ruleChangeSteps, RULE_CHANGE_ID, "gm"))
      .toBe(0);
    s = reduceRuleChange(s, { type: "rule-change-step",
      step: step("plan", "hr") });
    expect(stageOf(s.ruleChangeSteps, RULE_CHANGE_ID).kind)
      .toBe("waiting-gm");
    expect(ruleChangeWaiting(s.ruleChangeSteps, RULE_CHANGE_ID, "gm"))
      .toBe(1);
    s = reduceRuleChange(s, { type: "rule-change-step",
      step: step("plan", "gm") });
    expect(stageOf(s.ruleChangeSteps, RULE_CHANGE_ID).kind)
      .toBe("planned");
    s = reduceRuleChange(s, { type: "rule-change-undo",
      changeId: RULE_CHANGE_ID });
    expect(stageOf(s.ruleChangeSteps, RULE_CHANGE_ID).kind)
      .toBe("waiting-gm");
    s = reduceRuleChange(s, { type: "rule-change-step",
      step: step("hold", "gm") });
    const st = stageOf(s.ruleChangeSteps, RULE_CHANGE_ID);
    expect(st.kind).toBe("held");
  });

  it("a hold by HR ends it; nobody else is waiting", () => {
    const s = reduceRuleChange(RULE_CHANGE_INITIAL, {
      type: "rule-change-step", step: step("hold", "hr") });
    expect(stageOf(s.ruleChangeSteps, RULE_CHANGE_ID).kind).toBe("held");
    expect(ruleChangeWaiting(s.ruleChangeSteps, RULE_CHANGE_ID, "gm"))
      .toBe(0);
  });
});
