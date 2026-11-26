import { describe, expect, it } from "vitest";
import {
  AS_OF,
  FIRE_BRIEFING,
  SKILLS,
  SURVEY_MIN_GROUP,
  TRAINING_COURSES,
  buildDemoCompany,
  goalViews,
  homeNoticesFor,
  skillIdsFor,
  skillMatrix,
  skillSummary,
  surveyViews,
  trainingCourseViews,
  trainingRecords,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPD skills", () => {
  it("one row per person still at the bank, skills from the catalogue",
    () => each((c) => {
      const rows = skillMatrix(c);
      expect(rows).toHaveLength(c.employees.filter((e) =>
        e.leavingDate === null).length);
      const ids = new Set(SKILLS.map((s) => s.id));
      for (const r of rows) {
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        expect(r.skills.map((s) => s.skillId)).toEqual(skillIdsFor(e));
        for (const s of r.skills) {
          expect(ids.has(s.skillId)).toBe(true);
          expect(s.held >= 1 && s.held <= 4).toBe(true);
          expect(s.gap).toBe(Math.max(0, s.required - s.held));
        }
        expect(r.gaps).toBe(r.skills.filter((s) => s.gap > 0).length);
      }
    }));

  it("the summary counts add up to the matrix", () => each((c) => {
    const cells = skillMatrix(c).flatMap((r) => r.skills);
    const sum = skillSummary(c);
    expect(sum.reduce((n, s) => n + s.people, 0)).toBe(cells.length);
    expect(sum.reduce((n, s) => n + s.withGap, 0))
      .toBe(cells.filter((x) => x.gap > 0).length);
  }));
});

describe("WPD training", () => {
  it("nothing is completed before the person joined or after they left",
    () => each((c) => {
      for (const r of trainingRecords(c)) {
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        expect(e.leavingDate).toBeNull();
        if (r.completedOn !== null) {
          expect(r.completedOn.iso >= e.joiningDate).toBe(true);
          expect(r.completedOn.iso <= AS_OF).toBe(true);
        }
        if (r.sessionOn !== null) expect(r.sessionOn.iso > AS_OF)
          .toBe(true);
      }
    }));

  it("the new hire has induction to do, due as the 30-day check-in",
    () => each((c) => {
      const hire = c.employees.find((e) => e.cases.includes("probation"))!;
      const r = trainingRecords(c, { employeeId: hire.id, courseId:
        "tr-induction" });
      expect(r).toHaveLength(1);
      expect(r[0]!.status).toBe("to-do");
      expect(r[0]!.dueOn!.iso).toBe("2026-11-04");
    }));

  it("AML training: the compliance goal says 100% and records agree",
    () => each((c) => {
      const goal = goalViews(c, { kind: "department" }).find((g) =>
        g.id === "goal-compliance-2")!;
      const mine = trainingRecords(c, { courseId: "tr-aml" }).filter(
        (r) => c.employees.find((e) => e.id === r.employeeId)!
          .departmentId === goal.departmentId);
      const pct = Math.round(mine.filter((r) => r.status === "done")
        .length * 100 / mine.length);
      expect(pct).toBe(goal.current);
    }));

  it("the fire briefing is the notice's drill, head office staff only",
    () => each((c) => {
      const notice = homeNoticesFor(c, "hr").find((n) =>
        n.title.includes("Fire drill"))!;
      expect(notice.body).toContain("4 Nov 2026 at 10:00");
      expect(FIRE_BRIEFING).toEqual({ on: "2026-11-04", time: "10:00" });
      for (const r of trainingRecords(c, { courseId: "tr-fire" })) {
        expect(c.employees.find((e) => e.id === r.employeeId)!.location)
          .toBe("hq-abu-dhabi");
        expect(r.sessionOn!.iso).toBe("2026-11-04");
      }
    }));

  it("course counts match the records", () => each((c) => {
    const all = trainingRecords(c);
    for (const v of trainingCourseViews(c)) {
      expect(v.done + v.scheduled + v.toDo).toBe(all.filter((r) =>
        r.courseId === v.id).length);
      expect(v.overdue).toBe(0);
    }
    expect(trainingCourseViews(c)).toHaveLength(TRAINING_COURSES.length);
  }));
});

describe("WPD surveys", () => {
  it("never shows a group with fewer than the minimum answers", () => each(
    (c) => {
      const s = surveyViews(c)[0]!;
      for (const g of s.groups) {
        if (g.shown) expect(g.answered!).toBeGreaterThanOrEqual(
          SURVEY_MIN_GROUP);
        else {
          expect(g.answered).toBeNull();
          expect(g.display.answers).toBe("Too few answers to show");
        }
      }
      expect(s.groups.some((g) => g.shown)).toBe(true);
      expect(s.groups.some((g) => !g.shown)).toBe(true);
    }));

  it("response figures are consistent and engagement is the goal's", () =>
    each((c) => {
      const [done, next] = surveyViews(c);
      expect(done!.answered!).toBeLessThanOrEqual(done!.invited);
      expect(done!.responsePct).toBe(Math.round(done!.answered! * 100 /
        done!.invited));
      expect(done!.groups.reduce((n, g) => n + g.invited, 0))
        .toBe(done!.invited);
      const goal = goalViews(c, { kind: "department" }).find((g) =>
        g.id === "goal-exec-3")!;
      expect(done!.themes[0]!.favourablePct).toBe(goal.current);
      expect(next!.status).toBe("scheduled");
      expect(next!.invited).toBe(c.employees.filter((e) =>
        e.leavingDate === null).length);
    }));
});

describe("WPD talent wording", () => {
  it("names no authority decision as approved or certified", () => each(
    (c) => {
      const text = asText([skillMatrix(c), skillSummary(c),
        trainingRecords(c), trainingCourseViews(c), surveyViews(c)]);
      expect(text).not.toMatch(BANNED_WORDS);
      expect(text).not.toMatch(/accredit/i);
    }));
});
