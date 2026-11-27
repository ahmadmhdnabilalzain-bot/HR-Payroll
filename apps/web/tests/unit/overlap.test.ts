import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import {
  leaveIds,
  overlapsOf,
  requestRows,
} from "../../src/demo/time-off";

const d = buildDemoData();
const P = d.people;
const as = (s: DemoState, role: DemoState["role"]): DemoState =>
  ({ ...s, role });

describe("the approver sees who else is off on the same days", () => {
  it("Jose's 16-17 Nov request shows Rafiq's 16-20 Nov to Arjun", () => {
    const jose = P.personas().employeeId;
    const s = reduce(as(INITIAL, "employee"), { type: "request-leave",
      draft: { employeeId: jose, leaveTypeId: "lt-annual",
        startDate: "2026-11-16", endDate: "2026-11-17", halves: 4,
        reasonKey: "reason.travel", note: "", requestedOn: P.asOf,
        checkerId: P.approverOf(jose) } });
    const mgr = as(s, "manager");
    const rows = requestRows(d, mgr);
    const mine = rows.find((r) => r.id === "lr-new-1")!;
    const names = overlapsOf(rows, mine, new Set(leaveIds(d, mgr)))
      .map((x) => P.person(x.employeeId)?.name.en);
    expect(names).toContain("Rafiq Hossain");
  });

  it("two requests for the same days name the person once", () => {
    const jose = P.personas().employeeId;
    const draft = { employeeId: jose, leaveTypeId: "lt-annual" as const,
      startDate: "2026-11-16", endDate: "2026-11-17", halves: 4,
      reasonKey: "reason.travel", note: "", requestedOn: P.asOf,
      checkerId: P.approverOf(jose) };
    let s = reduce(as(INITIAL, "employee"), { type: "request-leave", draft });
    s = reduce(s, { type: "request-leave", draft });
    const mgr = as(s, "manager");
    const rows = requestRows(d, mgr);
    const rafiq = rows.find((r) => r.employeeId !== jose &&
      r.startDate <= "2026-11-17" && r.endDate >= "2026-11-16")!;
    const names = overlapsOf(rows, rafiq, new Set(leaveIds(d, mgr)))
      .map((x) => P.person(x.employeeId)?.name.en);
    expect(names.filter((n) => n === "Jose Reyes")).toHaveLength(1);
  });
});
