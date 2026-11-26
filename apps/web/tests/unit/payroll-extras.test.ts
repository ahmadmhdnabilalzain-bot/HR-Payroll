import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { buildExtrasSource } from "../../src/demo/data/payroll-extras";
import { buildRunSource } from "../../src/demo/data/run-detail";
import { approvalBlockedBy } from "../../src/demo/derive";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { mayOpen } from "../../src/nav/registry";
import { AREAS } from "../../src/nav/areas/payroll-extras";
import { canOpenPayArea, canSeePayRecords } from "../../src/pay/derive";
import { isPayArea } from "../../src/pay/PayArea";
import { gateChecks } from "../../src/pay/gate/checks";

const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const src = buildDemoSource();
const run = buildRunSource();
const x = buildExtrasSource();

function gateAt(s: DemoState) {
  const data = src.at(s.ibans);
  const d = run.at(s.ibans);
  return gateChecks({ blocked: approvalBlockedBy(data, s).map((id) =>
    data.employee(id).name.en), people: d.people,
  filePeople: d.file.people, limitPct: x.varianceLimitPct,
  limitText: x.varianceLimitText, correctionsWaiting: 0,
  correctionsBooked: 2, nextRun: "November 2026", contracts: x.contracts,
  holds: s.salaryHolds.length, list: (n) => n.join(" and ") });
}

describe("WP16 pre-pay gate (R15)", () => {
  it("agrees with Home: only bank details stop pay at first", () => {
    const g = gateAt(INITIAL);
    expect(g.filter((c) => !c.pass).map((c) => c.id)).toEqual(["iban"]);
    expect(g.find((c) => c.id === "iban")!.detail)
      .toMatch(/Priya Nair and Juma Al Zaabi/);
  });
  it("passes once both IBANs are entered", () => {
    const blocked = approvalBlockedBy(src.at({}), INITIAL);
    const s = blocked.reduce((st, id) => reduce(st, { type: "iban",
      employeeId: id, value: src.bankLetterIban(id) ?? "" }), INITIAL);
    expect(approvalBlockedBy(src.at(s.ibans), s)).toEqual([]);
    expect(gateAt(s).every((c) => c.pass)).toBe(true);
  });
});

describe("WP16 salary hold (R14)", () => {
  it("holds once, releases as its undo", () => {
    const hold = { employeeId: "emp-005", reason: "Test", by: "emp-028",
      role: "hr" as const, on: "2026-10-27" };
    const a = reduce(INITIAL, { type: "salary-hold", hold });
    const b = reduce(a, { type: "salary-hold", hold });
    expect(b.salaryHolds).toHaveLength(1);
    expect(reduce(b, { type: "salary-release", employeeId: "emp-005" })
      .salaryHolds).toEqual([]);
  });
});

describe("WP16 extras source", () => {
  it("journal follows the IBANs and stays balanced", () => {
    const j0 = x.journal({});
    expect(j0.balanced).toBe(true);
    expect(j0.lines.some((l) => l.account.includes("held"))).toBe(true);
    expect(j0.debits).toBe(run.at({}).totals.gross);
  });
  it("what-if with no change is the run", () => {
    const w = x.whatIf({ employeeId: x.people[0]!.id }, {});
    expect(w.run.after.net).toBe(run.at({}).totals.net);
  });
  it("shows no banned word", () => {
    const shown = JSON.stringify([x.elements, x.journal({}).lines,
      x.signOffs, x.samples, x.compare(x.samples[0]!.text), x.fields,
      x.fieldLimits, x.datasets.map((d) => [d.label, d.source])],
    (_k, v: unknown) => typeof v === "bigint" ? String(v) : v);
    expect(shown).not.toMatch(BANNED);
  });
});

describe("WP16 routes and roles", () => {
  it("every area is live, HR and GM only, and routed", () => {
    for (const a of AREAS) {
      expect(a.status).toBe("live");
      expect(a.roles).toEqual(["hr", "gm"]);
    }
    expect(isPayArea("gate")).toBe(true);
    expect(canOpenPayArea("employee", "gate")).toBe(false);
  });
  it("IT may open custom fields but not the parallel run's pay", () => {
    expect(mayOpen("it", { section: "setup",
      rest: ["migration", "fields"] })).toBe(true);
    expect(mayOpen("it", { section: "reports", rest: ["journal"] }))
      .toBe(false);
    expect(mayOpen("manager", { section: "pay-run",
      rest: ["gate", "what-if"] })).toBe(false);
    // The registry lets IT into Setup; the screen's own guard keeps pay.
    expect(canSeePayRecords("it")).toBe(false);
  });
});
