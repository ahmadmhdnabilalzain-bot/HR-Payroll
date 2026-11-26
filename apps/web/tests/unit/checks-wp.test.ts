import { describe, expect, it } from "vitest";
import { auditFor } from "../../src/demo/audit-actions";
import {
  CHECKS_INITIAL,
  openChecks,
  reduceChecks,
} from "../../src/demo/checks-state";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { figures } from "../../src/demo/figures";
import { INITIAL, reduce, type Action, type DemoState }
  from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { mayOpen } from "../../src/nav/registry";
import { beforeApproval } from "../../src/reports/dash/model";
import { anomalyRows } from "../../src/reports/checks/Anomalies";

const src = buildDemoSource();
const d = src.at({});
const note = { mark: "reviewed" as const, by: "emp-029", role: "hr" as const,
  on: "2026-10-27" };

describe("checks slice", () => {
  it("marks, takes back, saves and removes, with who and when", () => {
    let s = reduceChecks(CHECKS_INITIAL, { type: "check-mark",
      id: "net-swing:emp-014", employeeId: "emp-014", note });
    expect(s.checkMarks["net-swing:emp-014"]!.role).toBe("hr");
    expect(openChecks(s, ["net-swing:emp-014", "x"])).toEqual(["x"]);
    s = reduceChecks(s, { type: "check-unmark", id: "net-swing:emp-014",
      employeeId: "emp-014" });
    expect(s.checkMarks).toEqual({});
    s = reduceChecks(s, { type: "view-save", view: { name: "Variance",
      templateId: "variance", filter: "2026-10", by: "emp-029",
      role: "hr", on: "2026-10-27" } });
    expect(s.savedViews[0]!.id).toBe("view-1");
    s = reduceChecks(s, { type: "view-remove", id: "view-1" });
    expect(s.savedViews).toEqual([]);
  });

  it("writes an audit entry for a mark and its undo, with no amount",
    () => {
      const s: DemoState = { ...INITIAL, role: "hr" };
      const mark: Action = { type: "check-mark", id: "net-swing:emp-014",
        employeeId: "emp-014", note };
      const e = auditFor(mark, s, d)!;
      expect(e.action).toBe("pay.check-reviewed");
      expect(e.summary).toMatch(/marked a check on James Whitfield as rev/);
      const exp = auditFor({ ...mark, note: { ...note, mark: "expected" } },
        s, d)!;
      expect(exp.action).toBe("pay.check-expected");
      const un = auditFor({ type: "check-unmark", id: mark.id,
        employeeId: "emp-014" }, s, d)!;
      expect(un.action).toBe("pay.check-mark-undone");
      for (const x of [e, exp, un]) {
        expect(x.summary).not.toMatch(/AED|\d,\d{3}|approv/i);
      }
    });
});

describe("the scripted headline is untouched by the checks", () => {
  const all = (s: DemoState): string[] =>
    anomalyRows(d, s).map((r) => r.id);

  it("net, gross, file and held figures stay as scripted", () => {
    const h = d.headline();
    expect(h.netTotalFils).toBe(93373094n);
    expect(h.grossTotalFils).toBe(93868094n);
    expect(h.sifTotalFils).toBe(90843094n);
    expect(h.heldNetFils).toBe(2530000n);
  });

  it("marking every finding moves only the info count", () => {
    const base = figures(d, INITIAL);
    expect(base.anomalies).toBe(all(INITIAL).length);
    expect(base.anomalies).toBeGreaterThan(0);
    let s: DemoState = INITIAL;
    for (const id of all(INITIAL)) {
      s = reduce(s, { type: "check-mark", id, employeeId: "emp-001",
        note });
    }
    const after = figures(d, s);
    expect(after.anomalies).toBe(0);
    expect({ ...after, anomalies: 0 }).toEqual({ ...base, anomalies: 0 });
    expect(beforeApproval(d, s)).toEqual(beforeApproval(d, INITIAL));
  });

  it("the stop-pay and to-check counts are as before", () => {
    expect(beforeApproval(d, INITIAL)).toEqual({ stops: 2, checks: 6 });
  });
});

describe("the three rows", () => {
  const ids = ["reports.anomalies", "people.cost-of-hire",
    "reports.templates"];
  it("are live for HR and the General manager only", () => {
    const rows = ALL_AREAS.filter((a) => ids.includes(a.id));
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.status).toBe("live");
      expect([...(r.roles ?? [])]).toEqual(["hr", "gm"]);
      const route = r.route as { section: never; rest: string[] };
      expect(mayOpen("hr", route)).toBe(true);
      expect(mayOpen("gm", route)).toBe(true);
      for (const role of ["it", "manager", "employee"] as const) {
        expect(mayOpen(role, route)).toBe(false);
      }
    }
  });

  it("have panel labels of three words or fewer", () => {
    for (const a of ALL_AREAS.filter((x) => ids.includes(x.id))) {
      expect(a.label.en.split(" ").length).toBeLessThanOrEqual(3);
    }
  });

  it("the templates all point at live reports", () => {
    for (const t of d.checks.templates) {
      const a = ALL_AREAS.find((x) => x.id === t.areaId);
      expect([t.id, a?.status]).toEqual([t.id, "live"]);
    }
  });

  it("the anomaly count is an info count, not stop-pay", () => {
    const a = ALL_AREAS.find((x) => x.id === "reports.anomalies")!;
    expect(a.stopsPay).toBeUndefined();
  });
});
