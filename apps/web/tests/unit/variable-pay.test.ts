import { describe, expect, it } from "vitest";
import { contractProblems } from "../../src/components/explain/types";
import { auditFor } from "../../src/demo/audit-actions";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { bonusStatus } from "../../src/demo/bonus-state";
import { commissionStatus } from "../../src/demo/commission-state";
import { INITIAL, reduce, type Action, type DemoState }
  from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { isReachable, mayOpen } from "../../src/nav/registry";
import { buildVariableSource } from "../../src/pay/variable/source";

const src = buildDemoSource();
const v = buildVariableSource();
const stamp = { by: "emp-1", role: "hr" as const, on: "2026-10-27" };

const draft = () => ({ planId: v.bonus.id, label: v.bonus.label,
  scope: "all" as const, ids: v.bonus.rows.map((r) => r.employeeId),
  created: stamp, totals: { count: v.bonus.rows.length,
    gross: v.totalsOf(v.bonus.rows.map((r) => r.employeeId)).gross,
    net: v.totalsOf(v.bonus.rows.map((r) => r.employeeId)).net } });

/** What the provider does: the action, then its trail entry. */
function run(s: DemoState, a: Action): DemoState {
  const next = reduce(s, a);
  const e = next === s ? null : auditFor(a, s, src.at(s.ibans));
  return e === null ? next : reduce(next, { type: "audit-append",
    entry: e });
}

describe("bonus run: create, review, sign off", () => {
  it("walks draft, waiting, signed, and each step can be undone", () => {
    let s = run(INITIAL, { type: "bonus-new", draft: draft() });
    const id = s.bonusRuns[0]!.id;
    expect(bonusStatus(s.bonusRuns[0]!)).toBe("draft");
    s = run(s, { type: "bonus-send", id, stamp });
    expect(bonusStatus(s.bonusRuns[0]!)).toBe("waiting");
    s = run(s, { type: "bonus-decide", id, decision: { ...stamp,
      role: "gm", verdict: "signed" } });
    expect(bonusStatus(s.bonusRuns[0]!)).toBe("signed");
    s = run(s, { type: "bonus-undecide", id });
    expect(bonusStatus(s.bonusRuns[0]!)).toBe("waiting");
    s = run(s, { type: "bonus-unsend", id });
    expect(bonusStatus(s.bonusRuns[0]!)).toBe("draft");
    s = run(s, { type: "bonus-remove", id });
    expect(s.bonusRuns).toHaveLength(0);
    expect(s.auditAdded).toHaveLength(6);
  });

  it("a step out of order changes nothing and adds no entry", () => {
    const s = run(INITIAL, { type: "bonus-new", draft: draft() });
    const id = s.bonusRuns[0]!.id;
    for (const a of [
      { type: "bonus-decide", id, decision: { ...stamp,
        verdict: "signed" } },
      { type: "bonus-unsend", id },
      { type: "bonus-undecide", id },
      { type: "bonus-send", id: "nope", stamp },
    ] as Action[]) expect(run(s, a)).toBe(s);
    const sent = run(s, { type: "bonus-send", id, stamp });
    expect(run(sent, { type: "bonus-remove", id })).toBe(sent);
  });

  it("the audit entries say signed off or declined, never an amount",
    () => {
      let s = run(INITIAL, { type: "bonus-new", draft: draft() });
      const id = s.bonusRuns[0]!.id;
      s = run(s, { type: "bonus-send", id, stamp });
      s = run(s, { type: "bonus-decide", id, decision: { ...stamp,
        verdict: "declined" } });
      const text = s.auditAdded.map((e) => `${e.action} ${e.summary}`)
        .join("\n");
      expect(text).toMatch(/bonus-declined/);
      expect(text).not.toMatch(/approv|AED|\d{3}/i);
    });
});

describe("bonus run: the figures", () => {
  it("every drawer is a sound working", () => {
    for (const r of v.bonus.rows) {
      expect(contractProblems(v.bonusAmount(r))).toEqual([]);
      expect(contractProblems(v.bonusNet(r))).toEqual([]);
    }
    const ids = v.bonus.rows.map((r) => r.employeeId);
    expect(contractProblems(v.runGross(ids))).toEqual([]);
    expect(contractProblems(v.runNet(ids))).toEqual([]);
  });

  it("the run's drawer adds up to the total shown", () => {
    const ids = v.bonus.rows.map((r) => r.employeeId);
    const e = v.runGross(ids);
    expect(e.result.value).toEqual({ kind: "money",
      fils: v.totalsOf(ids).gross });
  });
});

describe("commission statements", () => {
  it("prepare, sign off, decline and prepare again", () => {
    const m = v.commission.month;
    const t = { count: 6, commission: 0n as never, net: 0n as never };
    let s = run(INITIAL, { type: "commission-prepare", month: m,
      prepared: stamp, totals: t });
    expect(commissionStatus(s.commissionMonths[m])).toBe("waiting");
    s = run(s, { type: "commission-decide", month: m, decision: { ...stamp,
      role: "gm", verdict: "declined" } });
    expect(commissionStatus(s.commissionMonths[m])).toBe("declined");
    s = run(s, { type: "commission-prepare", month: m, prepared: stamp,
      totals: t });
    expect(commissionStatus(s.commissionMonths[m])).toBe("waiting");
    s = run(s, { type: "commission-decide", month: m, decision: { ...stamp,
      role: "gm", verdict: "signed" } });
    expect(commissionStatus(s.commissionMonths[m])).toBe("signed");
    s = run(s, { type: "commission-undecide", month: m });
    expect(commissionStatus(s.commissionMonths[m])).toBe("waiting");
    expect(s.auditAdded).toHaveLength(5);
  });

  it("a signed month cannot be taken back as if unprepared", () => {
    const m = v.commission.month;
    let s = run(INITIAL, { type: "commission-prepare", month: m,
      prepared: stamp, totals: { count: 1, commission: 0n as never,
        net: 0n as never } });
    s = run(s, { type: "commission-decide", month: m, decision: { ...stamp,
      verdict: "signed" } });
    expect(run(s, { type: "commission-unprepare", month: m })).toBe(s);
  });

  it("every drawer is a sound working", () => {
    for (const x of v.commission.statements) {
      for (const e of [v.attainment(x), v.commissionOf(x),
        v.payableOf(x)]) expect(contractProblems(e)).toEqual([]);
    }
  });

  it("the Employee persona is on the plan (their own statement)", () => {
    const me = src.at({}).people.personas().employeeId;
    expect(v.commission.statements.some((x) => x.employeeId === me))
      .toBe(true);
  });
});

describe("who can open them", () => {
  const route = (...rest: string[]) => ({ section: "pay-run" as const,
    rest });
  it("HR and the General manager; not the IT manager or staff", () => {
    for (const p of ["bonus", "commission"]) {
      expect(mayOpen("hr", route(p))).toBe(true);
      expect(mayOpen("gm", route(p, "x"))).toBe(true);
      for (const r of ["it", "employee", "manager"] as const) {
        expect(mayOpen(r, route(p))).toBe(false);
      }
    }
  });

  it("two areas, short plain labels", () => {
    const a = ALL_AREAS.filter((x) => ["pay.bonus", "pay.commission"]
      .includes(x.id));
    expect(a).toHaveLength(2);
    for (const x of a) {
      expect(x.label.en.split(" ").length).toBeLessThanOrEqual(3);
      expect(isReachable(x, "hr")).toBe(true);
      expect(isReachable(x, "it")).toBe(false);
    }
  });
});
