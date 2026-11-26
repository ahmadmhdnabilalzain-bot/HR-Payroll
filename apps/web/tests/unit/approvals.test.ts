import { describe, expect, it } from "vitest";
import {
  approvalsShown,
  decideAction,
  decisionsFor,
  isSent,
  mayDecide,
  undoAction,
  waitingCount,
  waitingList,
} from "../../src/demo/approvals";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { approvalBlockedBy } from "../../src/demo/derive";
import { hrDashboardRows } from "../../src/reports/screens/dashboard-rows";
import { buildReportsSource } from "../../src/reports/source";
import { INITIAL, reduce, type DemoState, type Role }
  from "../../src/demo/state";

const src = buildDemoSource();
const as = (role: Role, s: DemoState = INITIAL): DemoState =>
  ({ ...s, role });
const fixed: DemoState = { ...INITIAL, ibans: Object.fromEntries(
  approvalBlockedBy(src.at({}), INITIAL).map((id) =>
    [id, src.bankLetterIban(id)])) };
const kinds = (s: DemoState): string[] =>
  decisionsFor(src.at(s.ibans), s).map((a) => a.kind).sort();

describe("one approvals source with each role's decide rights", () => {
  it("the GM decides the expense and the crew overtime, not leave", () => {
    expect(kinds(as("gm"))).toEqual(["expense", "overtime"]);
    const shown = approvalsShown(src.at({}), as("gm"));
    expect(shown.some((a) => a.kind === "leave")).toBe(false);
  });

  it("the pay run reaches the GM once the bank details are in", () => {
    expect(kinds(as("gm", fixed))).toEqual(["expense", "overtime",
      "pay-run"]);
  });

  it("nobody decides what they asked for; the maker only sees it", () => {
    const d = src.at({});
    for (const role of ["hr", "gm", "manager", "employee", "it"] as const) {
      for (const a of decisionsFor(d, as(role))) {
        expect(mayDecide(d, role, a)).toBe(true);
        expect(a.makerId).not.toBe(a.checkerId);
      }
    }
    const crew = d.crewApprovals()[0]!;
    expect(mayDecide(d, "manager", crew)).toBe(false);
    expect(mayDecide(d, "hr", crew)).toBe(false);
  });

  it("deciding crew overtime from Home is the Time page's decision", () => {
    const d = src.at({});
    const crew = d.crewApprovals()[0]!;
    const s1 = reduce(as("gm"), decideAction(d, "gm", crew, "approve"));
    expect(s1.timeDecided[crew.id]?.verdict).toBe("accept");
    expect(kinds(s1)).toEqual(["expense"]);
    const s2 = reduce(s1, undoAction(crew));
    expect(kinds(s2)).toEqual(["expense", "overtime"]);
  });
});

describe("waiting for a decision has one source", () => {
  it("Home, the HR dashboard and the list agree, per role", () => {
    const rep = buildReportsSource();
    for (const role of ["hr", "gm"] as const) {
      const st = as(role);
      const d = src.at(st.ibans);
      const n = waitingCount(d, st);
      expect(waitingList(d, st)).toHaveLength(n);
      expect(n, role).toBe(approvalsShown(d, st)
        .filter((a) => isSent(d, st, a)).length);
      const row = hrDashboardRows(rep, d, st)
        .find((r) => r[0] === "Waiting for a decision");
      expect(row?.[1], role).toBe(String(n));
    }
  });

  it("a pay run still held back is not counted", () => {
    const d = src.at({});
    expect(waitingCount(d, as("hr"))).toBe(4);
    const d2 = src.at(fixed.ibans);
    expect(waitingCount(d2, as("hr", fixed))).toBe(5);
  });
});
