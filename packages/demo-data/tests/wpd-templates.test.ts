import { daysBetween } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  AS_OF,
  HISTORY_OVERTIME,
  HISTORY_SICK,
  HOLIDAY_NOTE,
  attendanceDevices,
  buildDemoCompany,
  checklistTemplates,
  goalViews,
  holidayDates,
  holidays,
  isHoliday,
  joinerChecklistViews,
  kpiLibrary,
  kpiPeriods,
  appraisalCycleViews,
  letterTemplates,
  letters,
  nextHoliday,
  punches,
  renderLetterTemplate,
  unmatchedPunches,
  homeNoticesFor,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPD letter templates", () => {
  it("one per letter kind, named as the letters are", () => each((c) => {
    const t = letterTemplates(c);
    for (const l of letters(c)) {
      expect(t.find((x) => x.kind === l.kind)!.name).toBe(l.display.kind);
    }
    expect(t.map((x) => x.kind).sort()).toEqual(["experience", "noc",
      "salary-certificate"]);
    const n = t.reduce((a, x) => a + x.issued + x.waiting, 0);
    expect(n).toBe(letters(c).length);
  }));

  it("a filled salary letter carries the same salary line", () => each(
    (c) => {
      const l = letters(c).find((x) => x.kind === "salary-certificate")!;
      const text = renderLetterTemplate(c, "lttpl-salary-certificate",
        l.employeeId, l.purpose, l.addressee);
      expect(text).toContain(l.display.salary);
      expect(text).not.toMatch(/[{}]/);
      // Provenance is the page's sources line, never the letter's text.
      expect(text).not.toMatch(/demo letter|not an official|fictional/i);
    }));

  it("every field in a body has a value", () => each((c) => {
    for (const t of letterTemplates(c)) {
      const text = renderLetterTemplate(c, t.id, "emp-002", "x", "y");
      expect(text).not.toMatch(/[{}]/);
    }
  }));
});

describe("WPD checklist templates", () => {
  it("cover every step of every live checklist, same label and owner",
    () => each((c) => {
      const t = checklistTemplates(c);
      for (const v of joinerChecklistViews(c)) {
        const joiner = t.find((x) => x.id === (v.employeeId === null
          ? "pre-joiner" : "joiner"))!;
        for (const i of v.items) {
          const s = joiner.steps.find((x) => x.key === i.key)!;
          expect(s.label).toBe(i.label);
          expect(s.ownerRole).toBe(i.ownerRole);
        }
      }
      expect(t.reduce((n, x) => n + (x.id === "leaver" ? 0 : x.usedBy), 0))
        .toBe(joinerChecklistViews(c).length);
      expect(t.find((x) => x.id === "leaver")!.steps.length)
        .toBeGreaterThan(5);
    }));

  it("the new hire's dates equal first day plus the offsets", () => each(
    (c) => {
      const hire = joinerChecklistViews(c).find((v) =>
        v.employeeId !== null)!;
      const joiner = checklistTemplates(c).find((x) => x.id === "joiner")!;
      for (const i of hire.items) {
        const s = joiner.steps.find((x) => x.key === i.key)!;
        expect(s.dueOffsetDays).toBe(
  daysBetween(hire.joiningDate.iso, i.dueOn.iso));
      }
    }));
});

describe("WPD KPI library", () => {
  it("is the departments' goals, with the people they are given to",
    () => each((c) => {
      const lib = kpiLibrary(c);
      expect(lib.length).toBe(goalViews(c, { kind: "department" }).length);
      expect(new Set(lib.map((k) => k.id)).size).toBe(lib.length);
      for (const k of lib) {
        expect(k.assignedPeople).toBeGreaterThan(0);
      }
      const periods = kpiPeriods(c);
      expect(periods.map((p) => p.id)).toEqual(appraisalCycleViews(c)
        .map((p) => p.id));
    }));
});

describe("WPD attendance devices", () => {
  it("every punch and every unmatched punch belongs to one device", () =>
    each((c) => {
      const d = attendanceDevices(c);
      expect(d.reduce((n, x) => n + x.punchesToday, 0))
        .toBe(punches(c).length);
      expect(d.reduce((n, x) => n + x.unmatched, 0))
        .toBe(unmatchedPunches(c).length);
      const feeds = d.flatMap((x) => x.feedNames);
      expect(new Set(feeds).size).toBe(feeds.length);
      for (const p of punches(c)) expect(feeds).toContain(p.source);
      for (const u of unmatchedPunches(c)) expect(feeds).toContain(u.reader);
    }));
});

describe("WPD holidays", () => {
  it("every row says sample, and National Day matches the notice", () =>
    each((c) => {
      const h = holidays(c);
      expect(h.every((x) => x.display.note === HOLIDAY_NOTE)).toBe(true);
      expect(HOLIDAY_NOTE).toMatch(/Expected dates/);
      const nd = h.find((x) => x.id === "hol-national-day")!;
      expect(holidayDates(nd)).toEqual(["2026-12-02", "2026-12-03"]);
      const notice = homeNoticesFor(c, "gm").find((n) =>
        n.title.includes("National Day"))!;
      expect(asText(notice)).toContain("2 and 3 Dec 2026");
      expect(nextHoliday(c)!.id).toBe("hol-national-day");
    }));

  it("no holiday is a day the data treats as worked or on leave", () =>
    each((c) => {
      const worked = [...c.attendance.filter((a) => a.status !== "leave")
        .map((a) => a.date),
      ...Object.values(HISTORY_OVERTIME).flat().map((o) => o.date),
      ...HISTORY_SICK.flatMap(([, a, b]) => [a, b])];
      for (const d of worked) expect(isHoliday(d), d).toBe(false);
      for (const r of c.leaveRequests) {
        for (const h of holidays(c)) {
          expect(r.startDate <= h.to && r.endDate >= h.from, r.id)
            .toBe(false);
        }
      }
      expect(c.asOf).toBe(AS_OF);
    }));
});

describe("WPD templates wording", () => {
  it("names no authority decision as approved or certified", () => each(
    (c) => {
      const text = asText([letterTemplates(c), checklistTemplates(c),
        kpiLibrary(c), kpiPeriods(c), attendanceDevices(c), holidays(c)]);
      expect(text).not.toMatch(BANNED_WORDS);
    }));
});
