import { describe, expect, it } from "vitest";
import {
  assessEmployeeExpense,
  EMPLOYEE_EXPENSE_CASES,
  sourceOf,
  type ConditionId,
  type EmployeeExpenseCase,
  type EmployeeExpenseInput,
} from "../src/index";

const ART1: ConditionId[] = ["free-to-employee",
  "contract-or-documented-policy"];

const TABLE: Record<EmployeeExpenseCase, ConditionId[]> = {
  "transport": ["business-journeys-only", "no-cash-alternative"],
  "food-remote": ["remote-or-isolated-area", "no-food-facilities-nearby",
    "linked-to-work-or-residence-period", "no-cash-alternative"],
  "accommodation": ["no-cash-alternative", "operational-not-benefit",
    "near-site-required", "employee-only-or-required-family",
    "commensurate-no-recreation"],
  "new-employee-accommodation": ["within-max-days",
    "commensurate-with-job"],
  "phone-internet": ["necessary-for-duties", "personal-use-incidental",
    "documented-internal-policy", "monitoring-records-kept"],
  "parking": ["business-purposes-only", "documented-parking-policy",
    "receipt-date-time-amount-tax"],
};

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

function allTrue(c: EmployeeExpenseCase): EmployeeExpenseInput[
  "attestations"] {
  const ids = [...ART1, ...TABLE[c]].filter((id) =>
    id !== "within-max-days");
  return Object.fromEntries(ids.map((id) => [id, true]));
}

function run(c: EmployeeExpenseCase,
  extra: EmployeeExpenseInput["attestations"] = {},
  more: Partial<EmployeeExpenseInput> = {}) {
  return assessEmployeeExpense({ case: c, expenseDate: "2026-10-15",
    attestations: { ...allTrue(c), ...extra }, ...more });
}

describe("Decision 17 employee-expense conditions", () => {
  it("six_cases_listed", () => {
    expect(EMPLOYEE_EXPENSE_CASES.map((c) => c.case)).toEqual([
      "transport", "food-remote", "accommodation",
      "new-employee-accommodation", "phone-internet", "parking"]);
    for (const def of EMPLOYEE_EXPENSE_CASES) {
      expect(def.conditions.map((c) => c.id), def.case)
        .toEqual([...ART1, ...TABLE[def.case]]);
      expect(def.needsDocumentedPolicy, def.case).toBe(
        def.case === "phone-internet" || def.case === "parking");
    }
    expect(EMPLOYEE_EXPENSE_CASES.map((c) => c.sourceId)).toEqual(
      [1, 2, 3, 4, 5, 6].map((n) => `FTA_DEC17_2026_ART2_${n}`));
  });
  it("all_true_conditions_met", () => {
    const r = run("transport").value;
    expect(r.outcome).toBe("conditions-met");
    expect(r.unmet).toEqual([]);
    expect(r.unknown).toEqual([]);
    expect(r.met).toEqual([...ART1, ...TABLE.transport]);
    expect(r.packVersion).toBe("2026-10-01");
    expect(r.reason).toBeNull();
  });
  it("one_false_not_met", () => {
    const r = run("transport", { "no-cash-alternative": false }).value;
    expect(r.outcome).toBe("condition-not-met");
    expect(r.unmet).toEqual(["no-cash-alternative"]);
  });
  it("false_beats_unknown", () => {
    const both = run("transport", { "no-cash-alternative": false,
      "business-journeys-only": null }).value;
    expect(both.outcome).toBe("condition-not-met");
    expect(both.unknown).toEqual(["business-journeys-only"]);
    const nulls = run("transport", { "no-cash-alternative": null }).value;
    expect(nulls.outcome).toBe("not-assessed");
    const missing = assessEmployeeExpense({ case: "transport",
      expenseDate: "2026-10-15", attestations: {} }).value;
    expect(missing.outcome).toBe("not-assessed");
    expect(missing.unknown).toEqual([...ART1, ...TABLE.transport]);
  });
  it("before_effective_date_not_assessed", () => {
    const r = run("transport", {}, { expenseDate: "2026-09-30" });
    expect(r.value.outcome).toBe("not-assessed");
    expect(r.value.reason).toContain("2026-10-01");
    expect(r.value.packVersion).toBeNull();
    expect(r.trace).toHaveLength(1);
  });
  it("new_employee_days", () => {
    const c = "new-employee-accommodation";
    expect(run(c, {}, { stayDays: 30 }).value.outcome)
      .toBe("conditions-met");
    const late = run(c, {}, { stayDays: 31 }).value;
    expect(late.outcome).toBe("condition-not-met");
    expect(late.unmet).toEqual(["within-max-days"]);
    expect(codeOf(() => run(c, {}, { stayDays: 0 })))
      .toBe("INVALID_COUNT");
    expect(codeOf(() => run(c, {}, { stayDays: 1.5 })))
      .toBe("INVALID_COUNT");
    const none = run(c).value;
    expect(none.unknown).toContain("within-max-days");
    expect(none.outcome).toBe("not-assessed");
  });
  it("computed_condition_not_attestable", () => {
    expect(codeOf(() => run("new-employee-accommodation",
      { "within-max-days": true }, { stayDays: 3 })))
      .toBe("UNKNOWN_CONDITION");
    expect(codeOf(() => run("parking",
      { "remote-or-isolated-area": true }))).toBe("UNKNOWN_CONDITION");
  });
  it("stay_days_only_for_new_employee_case", () => {
    expect(codeOf(() => run("transport", {}, { stayDays: 3 })))
      .toBe("INVALID_INPUT");
  });
  it("policy_conditions_named", () => {
    expect(run("parking").value.policyConditions).toEqual([
      "contract-or-documented-policy", "documented-parking-policy"]);
    expect(run("transport").value.policyConditions).toEqual([
      "contract-or-documented-policy"]);
  });
  it("trace_names_the_case_source", () => {
    const r = run("new-employee-accommodation", {}, { stayDays: 5 });
    expect(r.trace).toHaveLength(1);
    const line = r.trace[0]!;
    expect(line.id).toBe("vat.employee-expense");
    expect(line.label).toContain(sourceOf("FTA_DEC17_2026_ART2_4").note);
    expect(line.rules.map((x) => x.key)).toEqual(
      ["newEmployeeAccommodationMaxDays"]);
    expect(line.rules[0]!.status).toBe("official");
    expect(run("transport").trace[0]!.rules).toEqual([]);
  });
  it("no_recover_word", () => {
    for (const def of EMPLOYEE_EXPENSE_CASES) {
      for (const c of def.conditions) {
        expect(c.text, c.id).not.toMatch(/recoverable|claimable/i);
      }
    }
  });
});
