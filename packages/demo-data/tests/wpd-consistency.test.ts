import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  attendanceDevices,
  buildDemoCompany,
  checklistTemplates,
  documentTypes,
  employerCostView,
  gradeBands,
  gratuityProvision,
  holidays,
  isHoliday,
  jobCatalogue,
  kpiLibrary,
  kpiPeriods,
  letterTemplates,
  payrollExclusions,
  signOffLevels,
  skillMatrix,
  surveyViews,
  trainingRecords,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const everything = (c: DemoCompany) => ({ grades: gradeBands(c),
  jobs: jobCatalogue(c), docTypes: documentTypes(c),
  levels: signOffLevels(c), exclusions: payrollExclusions(c),
  letters: letterTemplates(c), checklists: checklistTemplates(c),
  kpis: kpiLibrary(c), periods: kpiPeriods(c),
  devices: attendanceDevices(c), holidays: holidays(c),
  gratuity: gratuityProvision(c), cost: employerCostView(c),
  skills: skillMatrix(c), training: trainingRecords(c),
  surveys: surveyViews(c) });

/** Every string under a key called "display", wherever it sits. */
function displayStrings(x: unknown, inDisplay = false): string[] {
  if (typeof x === "string") return inDisplay ? [x] : [];
  if (Array.isArray(x)) return x.flatMap((y) => displayStrings(y,
    inDisplay));
  if (x !== null && typeof x === "object") {
    return Object.entries(x).flatMap(([k, v]) => displayStrings(v,
      inDisplay || k === "display"));
  }
  return [];
}

describe("WPD selectors agree with each other", () => {
  for (const seed of SEEDS) {
    const c = buildDemoCompany(seed);
    const all = everything(c);

    it(`seed ${seed}: pension, gratuity and cost name the same nationals`,
      () => {
        const nat = c.employees.filter((e) => e.workerClass ===
          "uae-national").map((e) => e.id).sort();
        const pension = all.exclusions.filter((r) =>
          r.element === "Pension").map((r) => r.employeeId).sort();
        const gratuity = all.gratuity.rows.filter((r) =>
          r.outcome === "not-applicable").map((r) => r.employeeId).sort();
        const cost = all.cost.rows.filter((r) => r.employer.status ===
          "not-computed").map((r) => r.employeeId).sort();
        expect(pension).toEqual(nat);
        expect(gratuity).toEqual(nat);
        expect(cost).toEqual(nat);
      });

    it(`seed ${seed}: every person named exists, leavers not trained`,
      () => {
        const ids = new Set(c.employees.map((e) => e.id));
        const named = [...all.exclusions.map((r) => r.employeeId),
          ...all.jobs.flatMap((j) => j.holderIds),
          ...all.skills.map((r) => r.employeeId),
          ...all.training.map((r) => r.employeeId),
          ...all.gratuity.rows.map((r) => r.employeeId),
          ...all.cost.rows.map((r) => r.employeeId)];
        for (const id of named) expect(ids.has(id), id).toBe(true);
        const left = new Set(c.employees.filter((e) =>
          e.leavingDate !== null).map((e) => e.id));
        for (const r of [...all.skills, ...all.training]) {
          expect(left.has(r.employeeId)).toBe(false);
        }
      });

    it(`seed ${seed}: headcounts agree across grades, jobs, cost`, () => {
      const n = c.employees.length;
      expect(all.grades.reduce((a, g) => a + g.headcount, 0)).toBe(n);
      expect(all.jobs.reduce((a, j) => a + j.holderIds.length, 0))
        .toBe(n);
      expect(all.cost.rows).toHaveLength(c.payRun.totals.payslips);
      expect(all.gratuity.rows.length + all.gratuity.settlement.length)
        .toBe(n);
    });

    it(`seed ${seed}: no booked session falls on a holiday`, () => {
      for (const r of all.training) {
        if (r.sessionOn !== null) {
          expect(isHoliday(r.sessionOn.iso)).toBe(false);
        }
      }
      for (const s of all.surveys) {
        expect(isHoliday(s.opensOn.iso)).toBe(false);
      }
    });

    it(`seed ${seed}: shown text has no raw ISO dates`, () => {
      const text = displayStrings(all);
      expect(text.length).toBeGreaterThan(100);
      for (const t of text) expect(t).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it(`seed ${seed}: no authority word, same bytes on a second build`,
      () => {
        const text = asText(all);
        expect(text).not.toMatch(BANNED_WORDS);
        expect(text).not.toMatch(/\bcompliant\b|accredit/i);
        expect(asText(everything(buildDemoCompany(seed)))).toBe(text);
      });
  }
});

describe("WPD source files", () => {
  it("say signed off, booked, declined; never approved or certified", () => {
    const dir = join(import.meta.dirname, "..", "src");
    const files = readdirSync(dir).filter((f) => /^wpd-.*\.ts$/.test(f));
    expect(files.length).toBe(4);
    for (const f of files) {
      const code = readFileSync(join(dir, f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      const strings = code.match(/"(?:[^"\\\n]|\\.)*"/g) ?? [];
      expect(strings.filter((s) => BANNED_WORDS.test(s)), f).toEqual([]);
    }
  });
});
