import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { mayOpen } from "../../src/nav/registry";
import {
  accessRows,
  changeRows,
  stepBy,
  ticketRows,
  travelRows,
} from "../../src/people/requests/model";

const d = buildDemoData();
const hr: DemoState = { ...INITIAL, role: "hr" };
const emp: DemoState = { ...INITIAL, role: "employee" };
const me = d.people.personas().employeeId;

describe("requests decisions", () => {
  it("a decision names who, role and date, and undo restores it", () => {
    const r = changeRows(d, hr).find((x) => x.status === "open")!;
    const done = reduce(hr, { type: "req-step", id: r.id,
      step: stepBy(d, hr, "done") });
    const after = changeRows(d, done).find((x) => x.id === r.id)!;
    expect(after.status).toBe("done");
    expect(after.step).toMatchObject({ role: "hr", on: d.requests.asOf });
    expect(after.step?.by).toBe(d.people.personas().hrId);
    const undone = reduce(done, { type: "req-undo", id: r.id });
    expect(changeRows(d, undone).find((x) => x.id === r.id)!.status)
      .toBe("open");
  });

  it("what an employee asks for shows in the queues", () => {
    let s = emp;
    const draft = { employeeId: me, raisedOn: d.requests.asOf, by: me,
      role: "employee" as const };
    s = reduce(s, { type: "req-new", draft: { ...draft, kind: "profile",
      values: { field: "mobile", proposed: "+971 50 555 0100", note: "" } } });
    s = reduce(s, { type: "req-new", draft: { ...draft, kind: "ticket",
      values: { category: "Leave", subject: "Balance", text: "How many?" } } });
    s = reduce(s, { type: "req-new", draft: { ...draft, kind: "travel",
      values: { depart: "2026-12-20", return: "2027-01-05", note: "" } } });
    s = reduce(s, { type: "req-new", draft: { ...draft, kind: "access",
      values: { role: "line-manager", reason: "Team lead" } } });
    expect(changeRows(d, s)[0]!.field).toBe("Mobile number");
    expect(ticketRows(d, s)[0]!.status).toBe("open");
    expect(travelRows(d, s)[0]!.status).toBe("open");
    expect(accessRows(d, s)[0]!.roleLabel).toBe("Line manager");
    const id = s.reqMade[0]!.id;
    const gone = reduce(s, { type: "req-new-undo", id });
    expect(gone.reqMade.some((x) => x.id === id)).toBe(false);
  });
});

describe("help desk threads", () => {
  it("a reply flips who is next; solved and reopen are steps", () => {
    const t = ticketRows(d, hr).find((x) => x.status === "open")!;
    const replied = reduce(hr, { type: "req-reply", draft: {
      ticketId: t.id, from: "hr", byId: d.requests.ownerId, role: "hr",
      on: d.requests.asOf, text: "On it." } });
    const row = ticketRows(d, replied).find((x) => x.id === t.id)!;
    expect(row.status).toBe("waiting");
    expect(row.thread.at(-1)!.text).toBe("On it.");
    const solved = reduce(replied, { type: "req-step", id: t.id,
      step: stepBy(d, replied, "solved") });
    expect(ticketRows(d, solved).find((x) => x.id === t.id)!.status)
      .toBe("solved");
    const reopened = reduce(solved, { type: "req-step", id: t.id,
      step: stepBy(d, solved, "open") });
    expect(ticketRows(d, reopened).find((x) => x.id === t.id)!.status)
      .toBe("waiting");
  });
});

describe("approval resets", () => {
  it("is a record plus the existing decision slice", () => {
    const a = d.approvalsInbox()[0]!;
    const signed = reduce(hr, { type: "decide", id: a.id,
      verdict: "approve" });
    const reset = reduce(reduce(signed, { type: "undecide", id: a.id }),
      { type: "appr-reset", id: a.id, stamp: { by: "x", role: "hr",
        on: d.requests.asOf, reason: "Wrong month", secondId: null } });
    expect(reset.decided[a.id]).toBeUndefined();
    expect(reset.apprResets[a.id]!.reason).toBe("Wrong month");
    expect(reduce(reset, { type: "appr-reset-undo", id: a.id })
      .apprResets[a.id]).toBeUndefined();
  });
});

describe("registry", () => {
  it("the new rows are live and guarded by role", () => {
    const ids = ["people.profile-changes", "people.travel",
      "people.helpdesk", "setup.access-requests", "setup.splits",
      "me.change-details", "me.calendar", "me.help", "requests.asks",
      "requests.access"];
    for (const id of ids) {
      expect(ALL_AREAS.find((a) => a.id === id)?.status).toBe("live");
    }
    expect(mayOpen("employee", { section: "people",
      rest: ["requests", "helpdesk"] })).toBe(false);
    expect(mayOpen("hr", { section: "people",
      rest: ["requests", "helpdesk"] })).toBe(true);
    expect(mayOpen("employee", { section: "me", rest: ["calendar"] }))
      .toBe(true);
    expect(mayOpen("hr", { section: "me", rest: ["help"] })).toBe(true);
    expect(mayOpen("it", { section: "people",
      rest: ["requests", "splits"] })).toBe(true);
  });
});
