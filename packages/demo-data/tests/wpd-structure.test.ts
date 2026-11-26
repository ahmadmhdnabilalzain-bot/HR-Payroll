import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_RULES,
  AS_OF,
  EXPENSE_LIMIT,
  approvalsInbox,
  buildDemoCompany,
  documentTypes,
  employeeById,
  expiryState,
  expenseRoute,
  gradeBands,
  jobCatalogue,
  overtimePaidStaff,
  payrollExclusions,
  reminderDates,
  signOffLevels,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPD jobs and grades", () => {
  it("every basic salary sits in its grade band, all seeds", () => each(
    (c) => {
      const bands = gradeBands(c);
      for (const e of c.employees) {
        const b = bands.find((x) => x.grade === e.grade)!;
        expect(e.basicMonthly >= b.basicMin).toBe(true);
        expect(e.basicMonthly <= b.basicMax).toBe(true);
      }
      expect(bands.reduce((n, b) => n + b.headcount, 0)).toBe(31);
      expect(bands.map((b) => b.grade)).toEqual([1, 2, 3, 4, 5, 6, 7, 8,
        9, 10]);
    }));

  it("every employee holds exactly one listed job", () => each((c) => {
    const jobs = jobCatalogue(c);
    const held = jobs.flatMap((j) => j.holderIds).sort();
    expect(held).toEqual(c.employees.map((e) => e.id).sort());
    for (const j of jobs) {
      for (const id of j.holderIds) {
        const e = employeeById(c, id);
        expect(e.jobKey).toBe(j.jobKey);
        expect(e.grade >= j.gradeMin && e.grade <= j.gradeMax).toBe(true);
      }
      expect(j.title.length).toBeGreaterThan(2);
    }
    expect(jobs.length).toBe(new Set(c.employees.map((e) => e.jobKey))
      .size);
  }));
});

describe("WPD document types", () => {
  it("tracked types add up to the documents on file", () => each((c) => {
    const t = documentTypes(c);
    expect(t.filter((x) => x.tracksExpiry)
      .reduce((n, x) => n + x.onFile, 0)).toBe(c.documents.length);
    expect(t.find((x) => x.kind === "emirates-id")!.expiringSoon)
      .toBe(c.documents.filter((d) => d.kind === "emirates-id" &&
        d.state !== "valid").length);
  }));

  it("reminder windows are the ones the expiry states use", () => {
    expect(expiryState(90)).toBe("expiring-90");
    expect(expiryState(91)).toBe("valid");
    expect(expiryState(30)).toBe("expiring-30");
    expect(reminderDates("2026-12-31")).toEqual(["2026-10-02",
      "2026-12-01"]);
  });
});

describe("WPD sign-off levels", () => {
  it("come from the approval rules, with the same expense limit", () =>
    each((c) => {
      const l = signOffLevels(c);
      expect(l.map((x) => x.ruleId)).toEqual(APPROVAL_RULES.map((r) =>
        r.id));
      expect(l.find((x) => x.ruleId === "expense-large")!.threshold)
        .toBe(EXPENSE_LIMIT);
      for (const claim of c.expenses) {
        const rule = expenseRoute(claim.amount).ruleId;
        expect(l.find((x) => x.ruleId === rule)!.steps.at(-1)!.roleId)
          .toBe(expenseRoute(claim.amount).roleId);
      }
    }));

  it("the pay run is prepared by one person and decided by another",
    () => each((c) => {
      const run = approvalsInbox(c).find((a) => a.kind === "pay-run")!;
      const steps = signOffLevels(c).find((x) => x.ruleId === "pay-run")!
        .steps;
      expect(steps.map((s) => s.who)).toEqual([
        employeeById(c, run.makerEmployeeId).fullName,
        employeeById(c, run.checkerEmployeeId).fullName]);
      expect(steps[0]!.who).not.toBe(steps[1]!.who);
    }));
});

describe("WPD payroll exclusions", () => {
  it("one pension and one gratuity row per UAE national", () => each(
    (c) => {
      const x = payrollExclusions(c);
      const nat = c.employees.filter((e) => e.workerClass ===
        "uae-national");
      expect(x.filter((r) => r.element === "Pension")).toHaveLength(
        nat.length);
      expect(x.filter((r) => r.kind === "not-applicable").map((r) =>
        r.employeeId).sort()).toEqual(nat.map((e) => e.id).sort());
      expect(x.every((r) => r.reason.length > 10)).toBe(true);
    }));

  it("the held payslip and the leaver are listed, nobody else", () =>
    each((c) => {
      const x = payrollExclusions(c);
      const held = c.payRun.payslips.filter((s) => !s.sif.included)
        .map((s) => s.employeeId);
      expect(x.filter((r) => r.kind === "held-out").map((r) =>
        r.employeeId)).toEqual(held);
      expect(x.filter((r) => r.kind === "outside-run").map((r) =>
        r.employeeId)).toEqual(c.payRun.settlements.map((s) =>
        s.employeeId));
    }));

  it("no overtime exemption: a grade 8 manager is paid night overtime",
    () => each((c) => {
      const ot = overtimePaidStaff(c);
      expect(ot.some((p) => p.grade >= 8)).toBe(true);
      expect(payrollExclusions(c).some((r) =>
        /overtime/i.test(r.element))).toBe(false);
    }));
});

describe("WPD structure wording", () => {
  it("names no authority decision as approved or certified", () => each(
    (c) => {
      const text = asText([gradeBands(c), jobCatalogue(c),
        documentTypes(c), signOffLevels(c), payrollExclusions(c),
        overtimePaidStaff(c)]);
      expect(text).not.toMatch(BANNED_WORDS);
      expect(AS_OF).toBe("2026-10-27");
    }));

  it("the source file says the same", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "src",
      "wpd-structure.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/"[^"]*\b(approved|certified)\b[^"]*"/);
  });
});
