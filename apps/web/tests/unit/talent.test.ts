import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { visibleIds } from "../../src/demo/time-off";
import { ALL_AREAS } from "../../src/nav/areas";
import { roleAllows } from "../../src/nav/registry";
import { lineOf } from "../../src/people/talent/Training";
import { T as WORDS } from "../../src/people/talent/words";

const d = buildDemoData();
const T = d.talent;
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;

describe("talent data", () => {
  it("every-person-has-skills-and-gaps-add-up", () => {
    const rows = T.skillMatrix();
    expect(rows.length).toBe(d.team.overview().headcount);
    for (const r of rows) {
      expect(r.skills.length).toBeGreaterThan(0);
      expect(r.gaps).toBe(r.skills.filter((k) => k.gap > 0).length);
    }
    const sum = T.skillSummary();
    expect(sum.reduce((n, x) => n + x.people, 0))
      .toBe(rows.reduce((n, r) => n + r.skills.length, 0));
  });

  it("the-basis-line-says-how-levels-are-worked-out", () => {
    expect(T.skillBasis).toMatch(/^Levels worked out/);
  });

  it("course-counts-match-the-records", () => {
    const recs = T.records();
    for (const c of T.courses()) {
      const l = lineOf(c, recs, T.asOf);
      expect(l.done).toBe(c.done);
      expect(l.booked).toBe(c.scheduled);
      expect(l.todo).toBe(c.toDo);
      expect(l.overdue).toBe(c.overdue);
    }
  });

  it("a-manager-sees-only-the-team-in-training", () => {
    const mgr = visibleIds(d, as("manager"));
    const all = T.records();
    const mine = all.filter((r) => mgr.includes(r.employeeId));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.length).toBeLessThan(all.length);
  });

  it("small-survey-groups-are-never-shown", () => {
    const sep = T.surveys().find((x) => x.status === "closed")!;
    expect(sep.groups.some((g) => !g.shown)).toBe(true);
    for (const g of sep.groups) {
      if (g.shown) expect(g.answered).toBeGreaterThanOrEqual(T.minGroup);
      else expect(g.answered).toBeNull();
    }
    expect(WORDS.surveys.why).toContain("{n}");
  });

  it("the-december-survey-is-scheduled", () => {
    const dec = T.surveys().find((x) => x.status === "scheduled")!;
    expect(dec.opensOn.display).toBe("30 Nov 2026");
    expect(dec.answered).toBeNull();
  });

  it("no-raw-dates-and-no-forbidden-claims-in-shown-text", () => {
    const shown = [...T.records().flatMap((r) => [r.display.when,
      r.display.status]), ...T.surveys().flatMap((s) =>
      [s.display.response, s.display.privacy]), T.skillBasis,
    JSON.stringify(WORDS)];
    for (const x of shown) {
      expect(x).not.toMatch(ISO);
      expect(x).not.toMatch(/compliant|approved|certified/i);
    }
  });
});

describe("talent areas", () => {
  const mine = ALL_AREAS.filter((a) =>
    /^people\.(skills|training|surveys)$/.test(a.id));
  it("three-live-rows-in-growth", () => {
    expect(mine.map((a) => a.id).sort())
      .toEqual(["people.skills", "people.surveys", "people.training"]);
    for (const a of mine) {
      expect([a.status, a.group]).toEqual(["live", "growth"]);
    }
  });
  it("roles-follow-the-brief", () => {
    const can = (id: string, r: DemoState["role"]) =>
      roleAllows(mine.find((a) => a.id === id)!, r);
    expect(can("people.training", "manager")).toBe(true);
    expect(can("people.skills", "manager")).toBe(false);
    expect(can("people.surveys", "manager")).toBe(false);
    for (const a of mine) expect(roleAllows(a, "employee")).toBe(false);
    for (const a of mine) expect(roleAllows(a, "hr")).toBe(true);
  });
});
