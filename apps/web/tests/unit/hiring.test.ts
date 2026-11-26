import { describe, expect, it } from "vitest";
import { auditFor } from "../../src/demo/audit-actions";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { figures } from "../../src/demo/figures";
import {
  HIRING_INITIAL,
  nextRequestId,
  reduceHiring,
  type HiringDraft,
} from "../../src/demo/hiring-state";
import {
  INITIAL,
  reduce,
  type Action,
  type DemoState,
  type Role,
} from "../../src/demo/state";
import { personFor } from "../../src/demo/time-off";
import { inboxNotes, inboxTasks } from "../../src/home/inbox/model";
import { ALL_AREAS } from "../../src/nav/areas";
import { areasFor, mayOpen } from "../../src/nav/registry";
import {
  actsFor,
  budgetRows,
  hiringTasks,
  requestsNow,
  timelineOf,
  visibleRequests,
} from "../../src/people/hiring/model";

const d = buildDemoSource().at({});
const ON = "2026-10-27";
const as = (role: Role, s: DemoState = INITIAL): DemoState =>
  ({ ...s, role });
const who = (role: Role) => ({ by: personFor(d, role), role, on: ON });
const run = (s: DemoState, ...xs: Action[]): DemoState =>
  xs.reduce((a, x) => reduce(a, x), s);
const find = (s: DemoState, id: string) =>
  requestsNow(d, s).find((r) => r.id === id)!;
const step = (s: DemoState, id: string, role: Role, to: string,
  note = ""): DemoState => {
  const r = find(s, id);
  return run(as(role, s), { type: "hiring-step", step: { requestId: id,
    to: to as never, from: r.status, note, req: null, ...who(role) } });
};
const draft = (): HiringDraft => {
  const me = personFor(d, "manager");
  const dept = d.people.person(me)!.departmentId;
  const role = d.hiring.roles().find((r) =>
    r.departmentIds.includes(dept))!;
  return { jobKey: role.jobKey, departmentId: dept, budgetId: null,
    reason: "new", replacesName: "", headcount: 1, startIso: "2027-02-01",
    urgency: "normal", timeToFillDays: 45, grade: role.gradeMin,
    jobDescription: d.hiring.jobDescription(role.jobKey, dept),
    mustHave: ["Two years in bank operations"], niceToHave: [],
    stages: d.hiring.stages(me), hiringManagerId: me };
};

describe("hiring slice", () => {
  it("ids come from one counter; undo takes the entry out", () => {
    let s = reduceHiring(HIRING_INITIAL, { type: "hiring-raise",
      draft: draft(), who: who("manager"), n: 7 });
    expect(s.hiringNew[0]!.id).toBe("hreq-new-1");
    expect(nextRequestId(s)).toBe("hreq-new-2");
    s = reduceHiring(s, { type: "hiring-message", message: {
      requestId: "hreq-new-1", text: "Hello", ...who("manager") } });
    expect(s.hiringMessages[0]!.id).toBe("hmsg-2");
    s = reduceHiring(s, { type: "hiring-raise-undo", id: "hreq-new-1" });
    expect(s.hiringNew).toEqual([]);
    expect(s.hiringMessages).toEqual([]);
  });

  it("a position the GM adds is his own sign-off", () => {
    const s = reduceHiring(HIRING_INITIAL, { type: "budget-ask", ask: {
      kind: "add", budgetId: null, grade: 4, steps: 0, reason: "x",
      jobKey: "teller", departmentId: "dept-retail",
      startIso: "2027-03-01", ...who("gm") } });
    expect(s.budgetDecisions["bask-new-1"]!.verdict).toBe("signed-off");
    const h = reduceHiring(HIRING_INITIAL, { type: "budget-ask", ask: {
      kind: "change", budgetId: "bud-pos-014", grade: 7, steps: 2,
      reason: "x", jobKey: "", departmentId: "", startIso: "",
      ...who("hr") } });
    expect(h.budgetDecisions).toEqual({});
  });
});

describe("hiring requests: who sees and does what", () => {
  it("HR and the GM see all six; the manager only their own", () => {
    expect(visibleRequests(d, as("hr"))).toHaveLength(6);
    expect(visibleRequests(d, as("gm"))).toHaveLength(6);
    const mine = visibleRequests(d, as("manager"));
    expect(mine.map((r) => r.id)).toEqual(["hreq-005"]);
    expect(visibleRequests(d, as("it"))).toEqual([]);
    expect(visibleRequests(d, as("employee"))).toEqual([]);
  });

  it("HR sends on, the GM signs off; only they get the buttons", () => {
    const r5 = find(INITIAL, "hreq-005");
    expect(actsFor(r5, "hr", personFor(d, "hr")).map((a) => a.id))
      .toEqual(["send", "changes", "hold"]);
    expect(actsFor(r5, "gm", personFor(d, "gm"))).toEqual([]);
    expect(actsFor(r5, "manager", personFor(d, "manager"))
      .map((a) => a.id)).toEqual(["withdraw"]);
    const r6 = find(INITIAL, "hreq-006");
    expect(actsFor(r6, "gm", personFor(d, "gm")).map((a) => a.label))
      .toEqual(["Sign off", "Ask for changes", "Decline", "Put on hold"]);
    expect(JSON.stringify(actsFor(r6, "gm", personFor(d, "gm"))))
      .not.toMatch(/approv/i);
  });

  it("end to end: raise, changes, again, send, sign off, open", () => {
    const id = nextRequestId(INITIAL);
    let s = run(as("manager"), { type: "hiring-raise", draft: draft(),
      who: who("manager"), n: 7 });
    expect(find(s, id).status).toBe("with-hr");
    expect(hiringTasks(d, as("hr", s)).some((t) =>
      t.id === `hiring:review:${id}`)).toBe(true);
    s = step(s, id, "hr", "changes", "Add the branch it covers.");
    expect(find(s, id).status).toBe("changes");
    expect(hiringTasks(d, as("manager", s)).map((t) => t.id))
      .toContain(`hiring:changes:${id}`);
    s = step(s, id, "manager", "with-hr");
    s = step(s, id, "hr", "with-gm");
    expect(hiringTasks(d, as("gm", s)).map((t) => t.id))
      .toContain(`hiring:signoff:${id}`);
    s = step(s, id, "gm", "open");
    const r = find(s, id);
    expect(r.status).toBe("open");
    expect(r.signedOffIso).toBe(ON);
    expect(r.events.map((e) => e.text)).toEqual(["Raised the request",
      "Asked for changes: Add the branch it covers.", "Sent again",
      "Sent for sign-off", "Signed off"]);
    const t = timelineOf(d, s, r);
    expect(t[0]!.text).toBe("Due 30 Oct 2026, in 3 days");
    expect(t[3]!.due!.display).toBe("11 Dec 2026");
    expect(budgetRows(d, s).filter((b) => b.requestId === id)
      .map((b) => b.status)).toEqual(["open"]);
    expect(hiringTasks(d, as("gm", s)).some((x) =>
      x.id === `hiring:signoff:${id}`)).toBe(false);
  });

  it("a requisition's request reads the Requisitions overlay", () => {
    let s = step(INITIAL, "hreq-002", "hr", "on-hold", "Budget review");
    s = run(s, { type: "move-step", key: "req:req-002", step: {
      value: "on-hold", from: "open", ...who("hr") } });
    expect(find(s, "hreq-002").status).toBe("on-hold");
    expect(budgetRows(d, s).find((b) => b.positionId === "pos-014")!
      .status).toBe("budgeted");
    // Reopened on the Requisitions screen: the request follows.
    s = run(s, { type: "move-step", key: "req:req-002", step: {
      value: "open", from: "on-hold", ...who("hr") } });
    expect(find(s, "hreq-002").status).toBe("open");
  });

  it("the held systems engineer goes back to the GM, then opens", () => {
    let s = step(INITIAL, "hreq-004", "hr", "with-gm");
    expect(find(s, "hreq-004").status).toBe("with-gm");
    s = run(as("gm", s), { type: "hiring-step", step: { requestId:
      "hreq-004", to: "open", from: "with-gm", note: "", ...who("gm"),
      req: { key: "req:req-004", before: null, set: { value: "open",
        from: "on-hold", ...who("gm") } } } });
    const row = budgetRows(d, s).find((b) => b.positionId === "pos-new-3")!;
    expect(row.budgetState).toBe("signed-off");
    expect(row.status).toBe("open");
  });
});

describe("hiring: one undo, both slices", () => {
  it("a linked step moves the requisition; undo puts it back, once", () => {
    const set = { value: "on-hold", from: "open", ...who("hr") };
    let s = run(as("hr"), { type: "hiring-step", step: { requestId:
      "hreq-002", to: "on-hold", from: "open", note: "", ...who("hr"),
      req: { key: "req:req-002", before: null, set } } });
    expect(s.moveSteps["req:req-002"]!.value).toBe("on-hold");
    expect(find(s, "hreq-002").status).toBe("on-hold");
    const id = s.hiringSteps[0]!.id;
    s = run(s, { type: "hiring-step-undo", id });
    expect(s.moveSteps["req:req-002"]).toBeUndefined();
    expect(find(s, "hreq-002").status).toBe("open");
    // The toast's undo after the page's: nothing changes, no audit line.
    expect(reduce(s, { type: "hiring-step-undo", id })).toBe(s);
    expect(reduce(s, { type: "budget-undecide", askId: "x" })).toBe(s);
    expect(reduce(s, { type: "hiring-message-undo", id: "x" })).toBe(s);
  });
});

describe("hiring budget", () => {
  it("a change on a position added in the demo waits, then applies", () => {
    let s = run(as("gm"), { type: "budget-ask", ask: { kind: "add",
      budgetId: null, grade: 4, steps: 0, reason: "Cover", jobKey: "teller",
      departmentId: "dept-retail", startIso: "2027-03-01", ...who("gm") } });
    const added = budgetRows(d, s).find((b) => b.session)!;
    expect(added.status).toBe("budgeted");
    s = run(as("hr", s), { type: "budget-ask", ask: { kind: "change",
      budgetId: added.id, grade: 4, steps: 3, reason: "Market",
      jobKey: "teller", departmentId: "dept-retail",
      startIso: "2027-03-01", ...who("hr") } });
    const asked = budgetRows(d, s).find((b) => b.id === added.id)!;
    expect(asked.pending!.steps).toBe(3);
    expect(hiringTasks(d, as("gm", s)).map((t) => t.id))
      .toContain(`hiring:budget:${asked.pending!.id}`);
    s = run(as("gm", s), { type: "budget-decide", decision: {
      askId: asked.pending!.id, verdict: "signed-off", note: "",
      ...who("gm") } });
    const done = budgetRows(d, s).find((b) => b.id === added.id)!;
    expect(done.steps).toBe(3);
    expect(done.cost.firstYear).toBeGreaterThan(added.cost.firstYear);
  });

  it("the General manager's own change is signed off at once", () => {
    const s = run(as("gm"), { type: "budget-ask", ask: { kind: "change",
      budgetId: "bud-pos-new-2", grade: 5, steps: 3, reason: "Market",
      jobKey: "", departmentId: "", startIso: "", ...who("gm") } });
    const row = budgetRows(d, s).find((b) => b.id === "bud-pos-new-2")!;
    expect(row.pending).toBeNull();
    expect(row.steps).toBe(3);
    expect(auditFor({ type: "budget-ask", ask: { kind: "change",
      budgetId: "bud-pos-new-2", grade: 5, steps: 3, reason: "x",
      jobKey: "", departmentId: "", startIso: "", ...who("gm") } },
    as("gm"), d)!.summary).toMatch(/changed and signed off/);
  });

  it("five seats; changes signed off move the cost", () => {
    const rows = budgetRows(d, INITIAL);
    expect(rows).toHaveLength(5);
    const rm = rows.find((b) => b.id === "bud-pos-014")!;
    expect(rm.pending!.id).toBe("bask-001");
    const s = run(as("gm"), { type: "budget-decide", decision: {
      askId: "bask-001", verdict: "signed-off", note: "", ...who("gm") } });
    const after = budgetRows(d, s).find((b) => b.id === "bud-pos-014")!;
    expect(after.pending).toBeNull();
    expect(after.steps).toBe(6);
    expect(after.cost.firstYear).toBeGreaterThan(rm.cost.firstYear);
    expect(after.left).toBe(after.cost.firstYear -
      (after.committed?.amount ?? 0n) - (after.offered?.amount ?? 0n));
  });

  it("an accepted offer on the board fills the seat", () => {
    const s = run(INITIAL, { type: "move-step", key: "offer:offer-002",
      step: { value: "accepted", from: "sent", ...who("hr") } });
    const row = budgetRows(d, s).find((b) => b.id === "bud-pos-014")!;
    expect(row.status).toBe("filled");
    expect(row.committed!.label).toBe("Offer accepted");
    expect(row.offered).toBeNull();
  });
});

describe("Home and the guard", () => {
  it("HR, the GM and the manager get their own tasks", () => {
    const ids = (r: Role) => inboxTasks(d, as(r)).map((t) => t.id)
      .filter((x) => x.startsWith("hiring:"));
    expect(ids("hr")).toContain("hiring:review:hreq-005");
    expect(ids("gm")).toEqual(expect.arrayContaining([
      "hiring:signoff:hreq-006", "hiring:budget:bask-001"]));
    expect(ids("manager")).toEqual([]);
    expect(ids("it")).toEqual([]);
    expect(ids("employee")).toEqual([]);
    const href = inboxTasks(d, as("hr")).find((t) =>
      t.id === "hiring:review:hreq-005")!.href;
    expect(href).toBe("#/people/hiring/requests/hreq-005");
  });

  it("notes tell HR of the manager's request, as a message", () => {
    const n = inboxNotes(d, as("hr")).filter((x) =>
      x.id.startsWith("hiring:"));
    expect(n.some((x) => x.body.startsWith("Wrote: Year-end"))).toBe(true);
    expect(inboxNotes(d, as("it")).some((x) => x.id.startsWith("hiring:")))
      .toBe(false);
  });

  it("mayOpen: budget for HR and GM; requests add the manager", () => {
    const r = (...rest: string[]) => ({ section: "people" as const,
      rest: ["hiring", ...rest] });
    const table: [string[], Role[]][] = [
      [["budget"], ["hr", "gm"]],
      [["budget", "bud-pos-014"], ["hr", "gm"]],
      [["requests"], ["hr", "gm", "manager"]],
      [["requests", "new"], ["hr", "gm", "manager"]],
      [["requests", "hreq-002"], ["hr", "gm", "manager"]]];
    for (const [rest, yes] of table) {
      for (const role of ["hr", "gm", "manager", "employee", "it"] as
        const) {
        expect([rest.join("/"), role, mayOpen(role, r(...rest))])
          .toEqual([rest.join("/"), role, yes.includes(role)]);
      }
    }
  });

  it("panel labels are three words or fewer; cost of hire is a keyword",
    () => {
      const ours = ALL_AREAS.filter((a) => a.id.includes("hiring") ||
        a.id === "requests.hire");
      expect(ours.map((a) => a.label.en)).toEqual(["Hiring budget",
        "Hiring requests", "Request a hire"]);
      for (const a of ours) {
        expect(a.label.en.split(" ").length).toBeLessThanOrEqual(3);
      }
      expect(ours[0]!.keywords).toMatch(/cost of hire/);
      expect(ALL_AREAS.some((a) => a.label.en === "Cost of hire"))
        .toBe(false);
      expect(areasFor("manager").map((a) => a.id)).toContain(
        "requests.hire");
      expect(areasFor("manager").map((a) => a.id)).not.toContain(
        "people.hiring-requests");
      expect(areasFor("it").some((a) => a.id.includes("hiring")))
        .toBe(false);
    });
});

describe("audit and figures", () => {
  it("every hiring action writes a line with no amount", () => {
    const s = as("gm");
    const acts: Action[] = [
      { type: "hiring-raise", draft: draft(), who: who("gm"), n: 7 },
      { type: "hiring-step", step: { requestId: "hreq-006", to: "open",
        from: "with-gm", note: "", req: null, ...who("gm") } },
      { type: "hiring-message", message: { requestId: "hreq-006",
        text: "AED 9,000 is fine", ...who("gm") } },
      { type: "budget-decide", decision: { askId: "bask-001",
        verdict: "declined", note: "No", ...who("gm") } }];
    const lines = acts.map((a) => auditFor(a, s, d)!);
    expect(lines.map((l) => l.action)).toEqual([
      "people.hiring-request-raised", "people.hiring-signed-off",
      "people.hiring-message", "people.budget-declined"]);
    for (const l of lines) {
      expect(l.summary).not.toMatch(/AED|\d{1,3},\d{3}/);
      expect(l.summary).not.toMatch(/approv/i);
      expect(l.area).toBe("people");
    }
  });

  it("the pay run's figures do not move", () => {
    const s = step(INITIAL, "hreq-006", "gm", "open");
    expect(figures(d, s)).toEqual(figures(d, INITIAL));
    expect(String(d.headline().netTotalFils)).toBe("93373094");
  });
});
