import { describe, expect, it } from "vitest";
import { auditFor } from "../../src/demo/audit-actions";
import { approvalItems } from "../../src/demo/approvals";
import { auditDrafts, type AuditAddition } from "../../src/demo/audit-state";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { INITIAL, reduce, type Action, type DemoState }
  from "../../src/demo/state";
import { buildReportsSource } from "../../src/reports/source";

const src = buildDemoSource();
const d = src.at({});
const reports = buildReportsSource();
const base = reports.audit.length;

/** What the provider does: the action, then its trail entry. */
function run(s: DemoState, a: Action): DemoState {
  const next = reduce(s, a);
  const e = next === s ? null : auditFor(a, s, src.at(s.ibans));
  return e === null ? next : reduce(next, { type: "audit-append",
    entry: e });
}

const payRun = approvalItems(d, INITIAL).find((a) => a.kind === "pay-run")!;
const leave = approvalItems(d, INITIAL).find((a) => a.kind === "leave")!;
const some = d.people.people()[0]!.id;

describe("the audit trail grows with the demo", () => {
  it("adds one entry per action, from the seeded count", () => {
    let s: DemoState = { ...INITIAL, role: "hr" };
    const steps: Action[] = [
      { type: "iban", employeeId: some, value: "AE070331234567890123456" },
      { type: "decide", id: payRun.id, verdict: "approve" },
      { type: "decide", id: leave.id, verdict: "decline" },
      { type: "rule-edit", edit: { key: "policy:annualDays", value: 30,
        what: "Annual leave days", who: "x", role: "HR", on: d
          .payCalendar().asOf } },
    ];
    steps.forEach((a, i) => {
      s = run(s, a);
      expect(s.auditAdded).toHaveLength(i + 1);
    });
    const trail = reports.auditWith(s.auditAdded);
    expect(trail.rows).toHaveLength(base + steps.length);
    expect(trail.verify(null).ok).toBe(true);
    expect(trail.verify(null).checked).toBe(base + steps.length);
  });

  it("names the action and the actor, and shows no amount or IBAN", () => {
    let s: DemoState = { ...INITIAL, role: "hr" };
    s = run(s, { type: "decide", id: payRun.id, verdict: "approve" });
    s = run(s, { type: "iban", employeeId: some,
      value: "AE070331234567890123456" });
    const [a, b] = s.auditAdded;
    expect(a!.action).toBe("payrun.signed-off");
    expect(a!.summary).toMatch(/signed off the pay run/);
    expect(a!.summary).toContain(d.employee(a!.actorId).name.en);
    expect(b!.action).toBe("pay.iban-saved");
    expect(JSON.stringify(s.auditAdded)).not.toMatch(/AE07|AED|\d,\d{3}/);
  });

  it("an undo adds an entry, nothing is taken out", () => {
    let s: DemoState = { ...INITIAL, role: "hr" };
    s = run(s, { type: "decide", id: leave.id, verdict: "approve" });
    s = run(s, { type: "undecide", id: leave.id });
    expect(s.auditAdded.map((x) => x.action))
      .toEqual(["leave.signed-off", "leave.decision-undone"]);
  });

  it("keeps time order on the demo clock, two minutes apart", () => {
    const e: AuditAddition = { action: "x", area: "pay", actorId: "a",
      on: "2026-10-27", subject: { kind: "k", id: "i", label: "l" },
      summary: "s" };
    const t = auditDrafts([e, e, e], "2026-10-27T09:42").map((x) => x.at);
    expect(t).toEqual(["2026-10-27T09:44", "2026-10-27T09:46",
      "2026-10-27T09:48"]);
    expect(auditDrafts([e], "2026-10-20T17:00")[0]!.at)
      .toBe("2026-10-27T09:00");
  });

  it("still breaks at the edited entry, new entries included", () => {
    let s: DemoState = { ...INITIAL, role: "hr" };
    s = run(s, { type: "decide", id: payRun.id, verdict: "approve" });
    const trail = reports.auditWith(s.auditAdded);
    expect(trail.verify(11).ok).toBe(false);
    expect(trail.verify(11).brokenAt).toBe(11);
    expect(trail.verify(base + 1).brokenAt).toBe(base + 1);
  });
});
