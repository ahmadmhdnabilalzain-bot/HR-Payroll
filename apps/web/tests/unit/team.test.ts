import { describe, expect, it } from "vitest";
import { contractProblems } from "../../src/components/explain/types";
import { buildDemoData } from "../../src/demo/data/adapter";
import type { OrgChartNode } from "../../src/demo/data/team-types";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { AREAS } from "../../src/nav/areas/people-team";
import { decideByExplanation } from "../../src/people/growth/probation-explain";
import { shortDay } from "../../src/people/team/common";

const d = buildDemoData();
const T = d.team;
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });
const walk = (n: OrgChartNode): OrgChartNode[] =>
  [n, ...n.children.flatMap(walk)];

describe("team data", () => {
  it("chart-holds-every-active-person-once", () => {
    const ids = walk(T.chart()).map((n) => n.employeeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(T.overview().headcount);
    expect(T.chart().title).toBe("General manager");
  });

  it("reporting-line-ends-at-the-general-manager", () => {
    for (const n of walk(T.chart()).slice(1)) {
      const line = T.reportingLine(n.employeeId);
      expect(line.at(-1)?.employeeId).toBe(T.chart().employeeId);
    }
    expect(T.reportingLine(T.chart().employeeId)).toEqual([]);
  });

  it("direct-reports-match-the-chart", () => {
    const head = T.chart().children[0]!;
    expect(T.directReports(head.employeeId).map((x) => x.employeeId))
      .toEqual(head.children.map((x) => x.employeeId));
  });

  it("seats-add-up", () => {
    const all = T.positions();
    const seats = T.seats();
    const sum = (k: "filled" | "vacant" | "onHold"): number =>
      seats.reduce((n, x) => n + x[k], 0);
    expect(sum("filled")).toBe(all.filter((x) =>
      x.status === "filled").length);
    expect(sum("vacant")).toBe(all.filter((x) =>
      x.status === "vacant").length);
    expect(sum("onHold")).toBe(1);
    expect(sum("filled")).toBe(T.overview().headcount);
  });

  it("cost-centres-add-up-to-the-pay-run-gross", () => {
    const total = T.costCentres().reduce((n, x) =>
      n + BigInt(x.monthlyGross.value), 0n);
    expect(total).toBe(BigInt(d.headline().grossTotalFils));
    expect(T.costCentres().reduce((n, x) => n + x.payslips, 0))
      .toBe(d.headline().headcount);
  });

  it("sites-add-up-to-the-headcount", () => {
    expect(T.sites().reduce((n, x) => n + x.headcount, 0))
      .toBe(T.overview().headcount);
  });

  it("open-cycle-has-a-due-date-and-counts", () => {
    const open = T.cycles().find((c) => c.status === "open")!;
    const rows = T.appraisals(open.id);
    expect(rows).toHaveLength(open.eligible);
    expect(rows.filter((a) => a.status !== "not-started"))
      .toHaveLength(open.selfDone);
    expect(open.selfDueOn.display).toBe("13 Nov 2026");
  });

  it("the-raise-shows-as-a-money-value-not-text", () => {
    const hit = T.appraisals().filter((a) => a.salaryOutcome !== null);
    expect(hit).toHaveLength(1);
    expect(typeof hit[0]!.salaryOutcome!.increase.value).toBe("bigint");
  });

  it("probation-new-hire-is-in-progress-with-a-decide-by-date", () => {
    const open = T.probation().filter((x) => x.status === "in-progress");
    expect(open).toHaveLength(1);
    const x = open[0]!;
    expect(x.decideBy.iso < x.probationEnd.iso).toBe(true);
    expect(x.decideBy.iso > x.joiningDate.iso).toBe(true);
    const ex = decideByExplanation(x, d.basis().ruleSet.en);
    expect(contractProblems(ex)).toEqual([]);
    expect(ex.rules[0]!.statusLabel).toContain("as we read it");
  });
});

describe("team actions", () => {
  const draft = { evaluationId: "prob-x", employeeId: "emp-x",
    scores: { attendance: 3, quality: 4, teamwork: 4, learning: 5 },
    suggestion: "confirm" as const, note: "", sentById: "a",
    sentOn: "2026-10-27", checkerId: "b" };

  it("send-decide-undo-and-withdraw", () => {
    let s = reduce(as("hr"), { type: "team-probation-send", draft });
    expect(s.probationRecords["prob-x"]?.verdict).toBeNull();
    s = reduce(s, { type: "team-probation-decide", id: "prob-x", byId: "b",
      on: "2026-10-27", call: "confirm" });
    expect(s.probationRecords["prob-x"]?.verdict?.call).toBe("confirm");
    s = reduce(s, { type: "team-probation-undo", id: "prob-x" });
    expect(s.probationRecords["prob-x"]?.verdict).toBeNull();
    s = reduce(s, { type: "team-probation-withdraw", id: "prob-x" });
    expect(s.probationRecords["prob-x"]?.withdrawn).toBe(true);
  });

  it("reminder-is-recorded-and-undone", () => {
    let s = reduce(as("hr"), { type: "team-remind", cycleId: "c", byId: "a",
      on: "2026-10-27" });
    expect(s.reminders["c"]?.byId).toBe("a");
    s = reduce(s, { type: "team-unremind", cycleId: "c" });
    expect(s.reminders["c"]).toBeUndefined();
  });

  it("unknown-ids-change-nothing", () => {
    const s = as("hr");
    expect(reduce(s, { type: "team-probation-undo", id: "none" })).toBe(s);
  });
});

describe("team areas", () => {
  const ctx = { data: d, state: as("hr") };

  it("every-area-is-live-for-hr-and-gm-only", () => {
    for (const a of AREAS) {
      expect(a.status).toBe("live");
      expect(a.roles).toEqual(["hr", "gm"]);
    }
  });

  it("counts-are-things-waiting", () => {
    const n = (id: string): number | null =>
      AREAS.find((a) => a.id === id)?.count?.(ctx) ?? null;
    expect(n("people.positions")).toBe(
      T.positions().filter((x) => x.status === "vacant").length);
    expect(n("people.probation")).toBe(1);
    expect(AREAS.every((a) => a.stopsPay !== true)).toBe(true);
  });

  it("probation-count-drops-once-decided", () => {
    const id = T.probation().find((x) => x.status === "in-progress")!.id;
    let s = reduce(as("hr"), { type: "team-probation-send", draft: {
      evaluationId: id, employeeId: "e", sentById: "a", checkerId: "b",
      sentOn: "2026-10-27", suggestion: "confirm", note: "",
      scores: { attendance: 3, quality: 3, teamwork: 3, learning: 3 } } });
    s = reduce(s, { type: "team-probation-decide", id, byId: "b",
      on: "2026-10-27", call: "confirm" });
    const count = AREAS.find((a) => a.id === "people.probation")!.count!;
    expect(count({ data: d, state: s })).toBe(0);
  });
});

describe("short day", () => {
  it("matches-the-data-package-style", () => {
    expect(shortDay("2026-10-27")).toBe("27 Oct 2026");
  });
});
