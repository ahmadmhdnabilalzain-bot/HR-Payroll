import { describe, expect, it } from "vitest";
import { auditFor } from "../../src/demo/audit-actions";
import { buildDemoData } from "../../src/demo/data/adapter";
import { ackKey } from "../../src/demo/policies-state";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { mayOpen } from "../../src/nav/registry";
import { ticketRows } from "../../src/people/requests/model";
import { walkSteps } from "../../src/me/Walkthrough";

const d = buildDemoData();
const ROLES = ["hr", "gm", "manager", "employee", "it"] as const;
const me = d.people.personas().employeeId;

describe("H15 policy answers", () => {
  it("the area is live and open to every role, the IT manager too", () => {
    const a = ALL_AREAS.find((x) => x.id === "me.policies")!;
    expect(a.status).toBe("live");
    expect(a.label.en.split(" ").length).toBeLessThanOrEqual(3);
    for (const role of ROLES) {
      expect(mayOpen(role, { section: "me", rest: ["policies", "leave"] }))
        .toBe(true);
    }
  });

  it("an acknowledgement names who and the version, and undoes", () => {
    const ack = { by: me, role: "employee" as const, on: d.policies.asOf,
      version: "3.1" };
    const s = reduce({ ...INITIAL, role: "employee" } as DemoState,
      { type: "policy-ack", policyId: "leave", ack });
    expect(s.policyAcks[ackKey(me, "leave")]).toEqual(ack);
    const back = reduce(s, { type: "policy-unack", policyId: "leave",
      by: me });
    expect(back.policyAcks).toEqual({});
  });

  it("an acknowledgement and its undo each add an audit entry", () => {
    const s: DemoState = { ...INITIAL, role: "employee" };
    const ack = { by: me, role: "employee" as const, on: d.policies.asOf,
      version: "3.1" };
    const a = auditFor({ type: "policy-ack", policyId: "leave", ack }, s,
      d)!;
    expect(a.action).toBe("people.policy-acknowledged");
    expect(a.summary).toMatch(/acknowledged Leave policy/);
    const u = auditFor({ type: "policy-unack", policyId: "leave", by: me },
      s, d)!;
    expect(u.action).toBe("people.policy-ack-undone");
  });

  it("Ask HR makes a ticket in the requests slice, and undo removes it",
    () => {
      const s = reduce({ ...INITIAL, role: "employee" } as DemoState, {
        type: "req-new", draft: { kind: "ticket", employeeId: me, by: me,
          role: "employee", raisedOn: d.requests.asOf, values: {
            category: "Other", subject: "Policy question",
            text: "Can I work from home?" } } });
      const t = ticketRows(d, s).find((x) => x.isNew)!;
      expect(t.subject).toBe("Policy question");
      expect(t.status).toBe("open");
      const gone = reduce(s, { type: "req-new-undo", id: t.id });
      expect(ticketRows(d, gone).some((x) => x.isNew)).toBe(false);
    });

  it("the adapter answers with a citation or says not covered", () => {
    expect(d.policies.ask("how do I report sick").hits[0]!.citation)
      .toBe("Leave policy, section 3.2");
    expect(d.policies.ask("zebra crossing").covered).toBe(false);
    expect(d.policies.notCovered).toBe("Not covered in our policies");
  });
});

describe("H12 walkthroughs", () => {
  it("every walkthrough has 3 to 6 steps", () => {
    for (const n of [1, 2, 3, 4]) {
      const w = walkSteps(Array.from({ length: n }, (_x, i) => `s${i}`));
      expect(w.length).toBeGreaterThanOrEqual(3);
      expect(w.length).toBeLessThanOrEqual(6);
    }
  });
});
