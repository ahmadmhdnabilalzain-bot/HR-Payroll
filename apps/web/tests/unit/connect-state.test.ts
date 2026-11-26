import { describe, expect, it } from "vitest";
import {
  CONNECT_INITIAL,
  connectChoice,
  reduceConnect,
} from "../../src/setup/more/state";

const edit = (key: string, value: string) => ({ key, value,
  what: `${key} set to ${value}`, who: "Rana Haddad", role: "IT manager",
  on: "2026-10-27" });

describe("connection choices", () => {
  it("records who, role and day, newest first, and undoes", () => {
    let s = reduceConnect(CONNECT_INITIAL,
      { type: "connect-edit", edit: edit("wa:switch", "On") });
    s = reduceConnect(s, { type: "connect-edit",
      edit: edit("wa:switch", "Off") });
    expect(s.connectEdits.map((e) => e.id)).toEqual([2, 1]);
    expect(connectChoice(s.connectEdits, "wa:switch")?.value).toBe("Off");
    s = reduceConnect(s, { type: "connect-undo", id: 2 });
    expect(connectChoice(s.connectEdits, "wa:switch")?.value).toBe("On");
    expect(s.connectEdits[0]).toMatchObject({ who: "Rana Haddad",
      role: "IT manager", on: "2026-10-27", undone: true });
  });

  it("starts with nothing chosen", () => {
    expect(connectChoice(CONNECT_INITIAL.connectEdits, "x")).toBeNull();
  });
});

import {
  PRIOR_INITIAL,
  priorOf,
  reducePrior,
} from "../../src/pay/more/state";
import { fils } from "@payroll/engine";

describe("prior-employment records", () => {
  const draft = { employeeId: "emp-031", employer: "Gulf Trade Bank",
    from: "2021-02-01", to: "2026-09-30", lastMonthly: fils(1850000n),
    evidence: "certificate", by: "emp-028", role: "hr",
    on: "2026-10-27" };

  it("adds, checks, unchecks and takes back", () => {
    let s = reducePrior(PRIOR_INITIAL, { type: "prior-add", draft });
    expect(priorOf(s.priorRecords, "emp-031")?.checked).toBeNull();
    s = reducePrior(s, { type: "prior-check", id: 1, stamp: { by: "emp-001",
      role: "gm", on: "2026-10-27" } });
    expect(priorOf(s.priorRecords, "emp-031")?.checked?.role).toBe("gm");
    s = reducePrior(s, { type: "prior-uncheck", id: 1 });
    expect(priorOf(s.priorRecords, "emp-031")?.checked).toBeNull();
    s = reducePrior(s, { type: "prior-undo", id: 1 });
    expect(s.priorRecords).toEqual([]);
  });
});
