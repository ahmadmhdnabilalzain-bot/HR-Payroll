import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import {
  complianceRows,
  daysBetweenIso,
  letterRows,
  requestRows,
  stepBy,
  visaRows,
  warningRows,
} from "../../src/people/papers/model";

const d = buildDemoData();
const hr: DemoState = { ...INITIAL, role: "hr" };

describe("papers data", () => {
  it("reads the package's records", () => {
    expect(d.papers.requests().length).toBeGreaterThanOrEqual(5);
    expect(d.papers.letters().length).toBeGreaterThanOrEqual(4);
    expect(d.papers.visas().length).toBe(3);
    expect(d.papers.warnings().length).toBe(2);
  });

  it("nationalities are headcount only", () => {
    const n = d.papers.nationalities();
    expect(n.rows.reduce((s, r) => s + r.count, 0)).toBe(n.headcount);
    expect(Object.keys(n)).not.toContain("target");
    expect(n.label).toMatch(/sample data/);
  });

  it("contract salary is a sum, null for strangers", () => {
    const cert = d.papers.letters().find((l) =>
      l.kind === "salary-certificate")!;
    expect(d.papers.contractSalary(cert.employeeId))
      .toBe(cert.monthlySalary);
    expect(d.papers.contractSalary("nobody")).toBeNull();
  });

  it("days between civil dates", () => {
    expect(daysBetweenIso("2026-10-26", "2026-10-27")).toBe(1);
    expect(daysBetweenIso("2026-10-27", "2026-10-27")).toBe(0);
  });
});

describe("papers decisions", () => {
  it("a decision changes the status and undo restores it", () => {
    const r = requestRows(d, hr)[0]!;
    expect(r.status).toBe("open");
    const done = reduce(hr, { type: "paper-step", id: r.id,
      step: stepBy(d, hr, "done") });
    const after = requestRows(d, done).find((x) => x.id === r.id)!;
    expect(after.status).toBe("done");
    expect(after.step?.on).toBe(d.papers.asOf);
    expect(after.waiting).toBeNull();
    const undone = reduce(done, { type: "paper-undo", id: r.id });
    expect(requestRows(d, undone).find((x) => x.id === r.id)!.status)
      .toBe("open");
  });

  it("a new request and a new letter appear first", () => {
    const s1 = reduce(hr, { type: "request-new", draft: { kind: "other",
      title: "Other", employeeId: "emp-002", note: "", raisedOn:
        d.papers.asOf, by: "emp-001" } });
    expect(requestRows(d, s1)[0]!.isNew).toBe(true);
    const s2 = reduce(s1, { type: "letter-new", draft: {
      kind: "salary-certificate", employeeId: "emp-002", purpose: "Visa",
      addressee: "Embassy", requestedOn: d.papers.asOf,
      checkerId: d.people.personas().gmId, by: "emp-001" } });
    const l = letterRows(d, s2)[0]!;
    expect(l.isNew).toBe(true);
    expect(l.status).toBe("pending");
    expect(l.monthlySalary).toBe(d.papers.contractSalary("emp-002"));
    expect(s2.nextPaper).toBe(3);
  });

  it("visa steps run in order and finish the case", () => {
    let s = hr;
    let v = visaRows(d, s).find((x) => x.id === "vc-1")!;
    expect(v.status).toBe("in-progress");
    while (v.next !== null) {
      s = reduce(s, { type: "paper-step", id: `${v.id}#${v.next.index}`,
        step: stepBy(d, s, "done") });
      v = visaRows(d, s).find((x) => x.id === "vc-1")!;
    }
    expect(v.status).toBe("completed");
  });

  it("a warning starts as a draft and records no deduction", () => {
    const w = warningRows(d, hr).find((x) => x.status === "draft")!;
    expect(w.deductionNote).toMatch(/not computed/);
  });
});

describe("papers overview and registry", () => {
  it("compliance lists pension as to check, never as met", () => {
    const rows = complianceRows(d, hr);
    expect(rows.find((r) => r.id === "pension")!.finding)
      .toMatch(/Not computed/);
    const text = JSON.stringify(rows);
    expect(text).not.toMatch(/\b(compliant|approved|certified)\b/i);
  });

  it("every papers area is live and routes under people/papers", () => {
    const mine = ALL_AREAS.filter((a) => a.id.startsWith("people.") &&
      typeof a.route !== "function" && a.route.rest?.[0] === "papers");
    expect(mine.length).toBeGreaterThanOrEqual(7);
    expect(mine.every((a) => a.status === "live")).toBe(true);
  });
});

describe("papers copy", () => {
  it("never claims, in words or data", async () => {
    const { readFileSync } = await import("node:fs");
    const words = readFileSync("src/people/papers/words.ts", "utf8");
    const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
    expect(words).not.toMatch(BANNED);
    const shown = JSON.stringify([d.papers.requests(), d.papers.letters()
      .map((l) => [l.purpose, l.addressee, l.reference]),
    d.papers.visas(), d.papers.warnings(), d.papers.nationalities()]);
    expect(shown).not.toMatch(BANNED);
  });
});
