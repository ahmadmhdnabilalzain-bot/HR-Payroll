import type { ChecklistTemplate } from "@payroll/contract";
import { calculateProbation, EMPLOYMENT_PACKS } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { expandTemplate, probationTasks } from "../src/onboarding/expand";

const EMP = "00000000-0000-4000-8000-0000000000e1";
const FLOW = { type: "onboarding" as const,
  id: "00000000-0000-4000-8000-0000000000f1" };
const MGR = "00000000-0000-4000-8000-0000000000a1";
const link = { employeeId: EMP, flow: FLOW,
  source: "onboarding-template" as const };

function template(items: ChecklistTemplate["items"]): ChecklistTemplate {
  return { kind: "onboarding", version: 0, items, isDefault: true,
    label: "product default, not law" };
}

describe("expandTemplate (pure)", () => {
  it("expand_negative_offset_before_start", () => {
    const [t] = expandTemplate(template([{ title: "Docs",
      category: "documents", assignee: "hr", dueOffsetDays: -7 }]),
      "2026-03-01", { managerUserId: null, employeeUserId: null }, link);
    expect(t!.dueDate).toBe("2026-02-22");
    expect(t!.assigneeRole).toBe("hr");
    expect(t!.flow).toEqual(FLOW);
    expect(t!.source).toBe("onboarding-template");
  });

  it("expand_manager_falls_back_to_hr", () => {
    const items = template([{ title: "Laptop", category: "equipment",
      assignee: "manager", dueOffsetDays: -3 }]);
    const [none] = expandTemplate(items, "2026-03-01",
      { managerUserId: null, employeeUserId: null }, link);
    expect(none!.assigneeRole).toBe("hr");
    expect(none!.assigneeUserId).toBeNull();
    const [some] = expandTemplate(items, "2026-03-01",
      { managerUserId: MGR, employeeUserId: null }, link);
    expect(some!.assigneeUserId).toBe(MGR);
    expect(some!.assigneeRole).toBeNull();
  });

  it("expand_employee_without_login_goes_to_hr", () => {
    const [t] = expandTemplate(template([{ title: "Return laptop",
      category: "equipment", assignee: "employee", dueOffsetDays: 0,
      checklist: ["Charger"] }]), "2026-03-01",
      { managerUserId: MGR, employeeUserId: null }, link);
    expect(t!.assigneeRole).toBe("hr");
    expect(t!.assigneeUserId).toBeNull();
    expect(t!.checklist).toEqual(["Charger"]);
  });

  it("probation_tasks_dates_from_engine", () => {
    const p = calculateProbation({ joiningDate: "2026-04-01",
      probationMonths: 3 }, EMPLOYMENT_PACKS);
    const ts = probationTasks(p, EMP, MGR, FLOW);
    expect(ts.map((t) => t.dueDate)).toEqual([
      p.value.employerNoticeDeadline, p.value.probationEndDate]);
    expect(ts.map((t) => t.rule?.id)).toEqual([
      "employment.probation.notice-deadline", "employment.probation.end"]);
    expect(ts.every((t) => t.source === "probation-reminder")).toBe(true);
    expect(ts.every((t) => t.assigneeUserId === MGR)).toBe(true);
  });

  it("probation_tasks_none_for_zero_months", () => {
    const p = calculateProbation({ joiningDate: "2026-04-01",
      probationMonths: 0 }, EMPLOYMENT_PACKS);
    expect(probationTasks(p, EMP, null, null)).toEqual([]);
  });
});
