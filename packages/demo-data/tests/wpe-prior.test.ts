import { daysBetween } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  AS_OF,
  buildDemoCompany,
  PRIOR_EVIDENCE,
  PRIOR_USE_NOTE,
  priorEmploymentRows,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE prior-employment rows (R25)", () => {
  it("lists the joiners of the last twelve months, newest first", () =>
    each((c) => {
      const rows = priorEmploymentRows(c);
      const want = c.employees.filter((e) => e.leavingDate === null &&
        daysBetween(e.joiningDate, AS_OF) <= 365)
        .sort((a, b) => a.joiningDate < b.joiningDate ? 1 : -1);
      expect(rows.map((r) => r.employeeId)).toEqual(want.map((e) => e.id));
      expect(rows.length).toBeGreaterThan(0);
    }));

  it("holds no pay figure: only joiners and words", () => each((c) => {
    const t = asText({ rows: priorEmploymentRows(c), PRIOR_EVIDENCE,
      PRIOR_USE_NOTE });
    expect(t).not.toMatch(/AED|\d{5,}/);
    expect(t).not.toMatch(BANNED_WORDS);
    expect(t).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
  }));
});
