import { describe, expect, it } from "vitest";
import { ALL_AREAS } from "../../src/nav/areas";
import { AREAS } from "../../src/nav/areas/setup-structure";
import { holidaysPage } from "../../src/setup/rules/pages";
import { buildStructureData, sampleHolidayText } from
  "../../src/setup/structure/data";

const d = buildStructureData();
const text = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) =>
  typeof x === "bigint" ? x.toString() : x);

describe("setup structure data", () => {
  it("lists jobs and grades from the roster", () => {
    expect(d.jobs.length).toBeGreaterThan(5);
    expect(d.grades.length).toBeGreaterThan(2);
    const heads = d.jobs.reduce((n, j) => n + j.holderIds.length, 0);
    expect(heads).toBe(d.grades.reduce((n, g) => n + g.headcount, 0));
  });

  it("tracks expiry for visa, Emirates ID and passport only", () => {
    const tracked = d.docTypes.filter((t) => t.tracksExpiry)
      .map((t) => t.kind).sort();
    expect(tracked).toEqual(["emirates-id", "passport", "residence-visa"]);
    for (const x of d.docsSoon) {
      expect(x.reminders).toHaveLength(2);
      expect(x.reminders[0]! < x.expiresOn).toBe(true);
    }
  });

  it("renders a letter with every field filled in", () => {
    const t = d.letters[0]!;
    const text = d.render(t.id, d.people[0]!.id, "a bank account", "Bank");
    expect(text).not.toMatch(/[{}]/);
    expect(text).toContain(d.people[0]!.name);
  });

  it("words sign-off, never approval", () => {
    expect(text(d.levels)).not.toMatch(/approv/i);
    const run = d.levels.find((l) => l.ruleId === "pay-run")!;
    expect(run.steps.map((x) => x.action)).toEqual(["prepares", "decides"]);
    expect(run.steps[0]!.who).not.toBe(run.steps[1]!.who);
  });

  it("keeps the holidays as sample dates", () => {
    expect(d.holidayNote).toMatch(/^Sample dates/);
    expect(d.holidays.every((h) => h.display.note === d.holidayNote))
      .toBe(true);
    const h = sampleHolidayText();
    expect(h.count).toBe(d.holidays.length);
    const page = holidaysPage();
    const item = page.groups[0]!.items[0]!;
    expect(item.value).toBe(`${h.count} sample dates`);
    expect(item.help).toMatch(/follow the official announcement/);
  });

  it("reads exemptions and devices from the data", () => {
    expect(d.exclusions.length).toBeGreaterThan(0);
    expect(d.devices.map((x) => x.kind)).toContain("phone");
  });

  it("names no overclaiming words in any list", () => {
    const all = text([d.exclusions, d.levels, d.kpis,
      d.checklists, d.letters, d.devices, d.holidays]);
    expect(all).not.toMatch(/compliant|certified|approved/i);
  });
});

describe("setup structure registry", () => {
  it("registers nine live areas for HR and the GM", () => {
    expect(AREAS).toHaveLength(9);
    for (const a of AREAS) {
      expect(a.status).toBe("live");
      expect(a.roles).toEqual(["hr", "gm"]);
    }
    const ids = ALL_AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
