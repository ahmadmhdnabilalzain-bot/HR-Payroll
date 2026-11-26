import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { allApprovals } from "../../src/demo/time-off";
import { ALL_AREAS } from "../../src/nav/areas";

const d = buildDemoData();
const claim = { employeeId: "emp-017", kind: "Travel", date: "2026-10-20",
  amount: fils(8550n), note: "", checkerId: "emp-016",
  requestedOn: "2026-10-27" };

describe("WP18 store", () => {
  it("a claim becomes one approval for its decider, and can be taken back",
    () => {
      const a = reduce(INITIAL, { type: "more-claim", draft: claim });
      const ap = allApprovals(d, a).find((x) => x.kind === "expense" &&
        x.employeeId === "emp-017");
      expect(ap?.checkerId).toBe("emp-016");
      expect(ap?.amountFils).toBe(fils(8550n));
      const id = a.claims[0]!.id;
      const b = reduce(a, { type: "more-claim-withdraw", id });
      expect(allApprovals(d, b).some((x) => x.employeeId === "emp-017" &&
        x.kind === "expense")).toBe(false);
      expect(reduce(b, { type: "more-claim-restore", id }).claims[0]!
        .withdrawn).toBe(false);
    });

  it("ids come from the counter, so two requests never share one", () => {
    let s: DemoState = reduce(INITIAL, { type: "more-claim",
      draft: claim });
    s = reduce(s, { type: "more-claim", draft: claim });
    expect(new Set(s.claims.map((c) => c.approvalId)).size).toBe(2);
  });

  it("a cover request carries its own approval id", () => {
    const s = reduce(INITIAL, { type: "more-cover", draft: { approverId:
      "emp-016", coverId: "emp-004", from: "2026-11-02", to: "2026-11-06",
    makerId: "emp-016", checkerId: "emp-028",
    requestedOn: "2026-10-27" } });
    expect(s.covers[0]!.approvalId).toMatch(/^more-ap-/);
  });
});

describe("WP18 registry", () => {
  it("the six rows are live, with the roles the screens guard", () => {
    const by = (id: string) => ALL_AREAS.find((a) => a.id === id)!;
    expect(by("people.new-employee").roles).toEqual(["hr", "gm"]);
    expect(by("me.team-reviews").roles).toEqual(["manager"]);
    for (const id of ["people.new-employee", "setup.cover", "me.expenses",
      "time.my-card", "me.kpis", "me.team-reviews", "requests.cover"]) {
      expect([id, by(id).status]).toEqual([id, "live"]);
    }
  });

  it("the new-employee list holds the accepted offer, no one else", () => {
    expect(d.more.starts().map((x) => x.name)).toEqual(["Faisal Chaudhry"]);
    expect(d.employees().some((e) => e.name.en === "Faisal Chaudhry"))
      .toBe(false);
  });
});
