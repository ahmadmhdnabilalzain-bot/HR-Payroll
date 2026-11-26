import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import {
  PLANNING_INITIAL,
  reducePlanning,
  signedOffIds,
  type PlanItem,
} from "../../src/demo/planning-state";
import { ALL_AREAS } from "../../src/nav/areas";

const item = (id: string): PlanItem => ({ employeeId: id, name: id,
  departmentId: "d", departmentText: "D", steps: 1, from: fils(100n),
  to: fils(125n), effective: "1 Jan 2027" });

describe("planning slice", () => {
  it("proposes, clears, signs off and undoes with who and when", () => {
    let s = reducePlanning(PLANNING_INITIAL, { type: "plan-set",
      employeeId: "e1", proposal: { steps: 2, by: "emp-1", role: "hr",
        on: "2026-10-27" } });
    expect(s.planProposals["e1"]!.by).toBe("emp-1");
    s = reducePlanning(s, { type: "plan-signoff", items: [item("e1")],
      by: "emp-2", role: "gm", on: "2026-10-27" });
    expect(s.planBatches[0]!.role).toBe("gm");
    expect(signedOffIds(s).has("e1")).toBe(true);
    const id = s.planBatches[0]!.id;
    s = reducePlanning(s, { type: "plan-unsign", id });
    expect(signedOffIds(s).size).toBe(0);
    s = reducePlanning(s, { type: "plan-set", employeeId: "e1",
      proposal: null });
    expect(s.planProposals).toEqual({});
  });

  it("the four rows are live, for HR and the General manager only", () => {
    const rows = ALL_AREAS.filter((a) => ["people.comp-plan",
      "people.workforce-plan", "reports.cost-budget", "reports.forecast"]
      .includes(a.id));
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.status).toBe("live");
      expect([...(r.roles ?? [])]).toEqual(["hr", "gm"]);
    }
  });
});
