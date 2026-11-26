import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import {
  addedAndRemoved,
  ANOMALY_RULES,
  anomalyChecks,
  buildDemoCompany,
  duplicateAccounts,
  gradeBands,
  hireCostPreview,
  hirePackage,
  hireRoles,
  netSwings,
  overtimeSpikes,
  payrollHistory,
  REPORT_TEMPLATES,
  salaryWithoutRevision,
  templateChoices,
  workforcePlan,
  type DemoCompany,
  type HireInput,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const sum = (xs: readonly bigint[]) => xs.reduce((n, x) => n + x, 0n);

describe("WPE checks: the rules alone", () => {
  it("net swings need both the share and the minimum", () => {
    const rows = [
      { id: "big", before: 1000000n, now: 800000n },
      { id: "tiny-share", before: 10000000n, now: 10100000n },
      { id: "tiny-sum", before: 100000n, now: 90000n },
      { id: "same", before: 500000n, now: 500000n },
    ];
    expect(netSwings(rows)).toEqual(["big"]);
  });

  it("finds people added and removed between two runs", () => {
    expect(addedAndRemoved(["a", "b"], ["b", "c"]))
      .toEqual({ added: ["c"], removed: ["a"] });
    expect(addedAndRemoved(["a"], ["a"]))
      .toEqual({ added: [], removed: [] });
  });

  it("finds a shared account, ignoring blanks", () => {
    const g = duplicateAccounts([{ id: "a", iban: "AE1" },
      { id: "b", iban: "AE1" }, { id: "c", iban: "AE2" },
      { id: "d", iban: null }, { id: "e", iban: null }]);
    expect(g).toEqual([["a", "b"]]);
  });

  it("an overtime spike is far above the busiest earlier month", () => {
    expect(overtimeSpikes([
      { id: "a", now: 360, earlierMax: 120 },
      { id: "b", now: 150, earlierMax: 100 },
      { id: "c", now: 60, earlierMax: 0 },
      { id: "d", now: 120, earlierMax: 0 }])).toEqual(["a", "d"]);
  });

  it("a basic change with no revision is flagged, one with is not", () => {
    expect(salaryWithoutRevision([
      { id: "a", before: 1n, now: 2n, hasRevision: false },
      { id: "b", before: 1n, now: 2n, hasRevision: true },
      { id: "c", before: 2n, now: 2n, hasRevision: false }]))
      .toEqual(["a"]);
  });
});

describe("WPE checks: October against September", () => {
  it("names the two months and lists every rule", () => each((c) => {
    const r = anomalyChecks(c);
    expect(r.month).toBe("2026-10");
    expect(r.against).toBe("2026-09");
    expect(r.rules.map((x) => x.id)).toEqual(ANOMALY_RULES.map((x) =>
      x.id));
    expect(sum(r.rules.map((x) => BigInt(x.count))))
      .toBe(BigInt(r.findings.length));
  }));

  it("net swings are real changes between the two runs", () => each((c) => {
    const h = payrollHistory(c);
    const now = new Map(h[9]!.lines.map((l) => [l.employeeId, l.net]));
    const was = new Map(h[8]!.lines.map((l) => [l.employeeId, l.net]));
    for (const f of anomalyChecks(c).findings.filter((x) =>
      x.ruleId === "net-swing")) {
      const [a, b, d] = f.figures;
      expect(a!.value).toBe(was.get(f.employeeId));
      expect(b!.value).toBe(now.get(f.employeeId));
      expect(d!.value).toBe(b!.value - a!.value);
    }
  }));

  it("every person's change adds up to the run's change", () => each((c) => {
    const h = payrollHistory(c);
    const was = new Map(h[8]!.lines.map((l) => [l.employeeId, l.net]));
    const moved = sum(h[9]!.lines.filter((l) => was.has(l.employeeId))
      .map((l) => l.net - was.get(l.employeeId)!));
    const joined = sum(h[9]!.lines.filter((l) => !was.has(l.employeeId))
      .map((l) => l.net));
    expect(moved + joined).toBe(h[9]!.net - h[8]!.net);
  }));

  it("the new payee is the October joiner; nobody dropped off",
    () => each((c) => {
      const r = anomalyChecks(c);
      const added = r.findings.filter((f) => f.ruleId === "new-payee");
      expect(added.map((f) => f.employeeId)).toEqual(["emp-009"]);
      expect(r.rules.find((x) => x.id === "removed-payee")!.count).toBe(0);
    }));

  it("the late salary raise has its revision, so it is not flagged",
    () => each((c) => {
      const r = anomalyChecks(c);
      expect(r.findings.some((f) => f.ruleId === "salary-no-revision"))
        .toBe(false);
    }));

  it("no two people share an account in the seeded data", () => each((c) => {
    expect(anomalyChecks(c).rules.find((x) => x.id === "duplicate-iban")!
      .count).toBe(0);
  }));

  it("a bank detail request this month is found, as asked not changed",
    () => each((c) => {
      const f = anomalyChecks(c).findings.filter((x) =>
        x.ruleId === "bank-changed");
      expect(f.map((x) => x.employeeId)).toEqual(["emp-023"]);
      expect(f[0]!.what).toMatch(/^Asked to change bank details on /);
    }));

  it("a bank account saved in the session adds a finding", () => each((c) => {
    const f = anomalyChecks(c, { bankSaved: ["emp-027"] }).findings
      .filter((x) => x.ruleId === "bank-changed");
    expect(f.map((x) => x.employeeId)).toEqual(["emp-023", "emp-027"]);
  }));

  it("finding ids are unique and hold no amount or banned word",
    () => each((c) => {
      const r = anomalyChecks(c, { bankSaved: ["emp-027"] });
      const ids = r.findings.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      const words = asText({ basis: r.basis, findings: r.findings.map(
        (f) => ({ ...f, figures: [] })) });
      expect(asText(r.rules)).not.toMatch(BANNED_WORDS);
      expect(words).not.toMatch(BANNED_WORDS);
      expect(words).not.toMatch(/AED|\d{1,3},\d{3}/);
      expect(words).not.toMatch(/\bAI\b|machine|predict(s|ed)? that/i);
    }));
});

const input = (c: DemoCompany, over: Partial<HireInput> = {}): HireInput => {
  const r = hireRoles(c).find((x) => x.jobKey === "teller")!;
  return { jobKey: r.jobKey, grade: r.gradeMin, startIso: "2027-02-01",
    national: false, ...over };
};

describe("WPE checks: cost of hire", () => {
  it("the package is the band floor, as the grade bands say",
    () => each((c) => {
    for (const b of gradeBands(c)) {
      expect(hirePackage(b.grade).basic).toBe(b.basicMin);
      const t = hirePackage(b.grade).allowances.find((a) =>
        a.code === "transport")!;
      expect(t.monthly).toBe(b.transport);
    }
  }));

  it("twelve engine months, first year is their sum", () => each((c) => {
    const p = hireCostPreview(c, input(c));
    expect(p.problems).toEqual([]);
    expect(p.months).toHaveLength(12);
    expect(p.months[0]!.month).toBe("2027-02");
    expect(p.firstYearGross).toBe(sum(p.months.map((m) => m.gross)));
    expect(p.months[0]!.part).toBe(false);
    const gross = hirePackage(1);
    const all = gross.allowances.reduce((n, a) => n + a.monthly, 0n);
    expect(p.monthlyGross).toBe(gross.basic + all);
    expect(p.months[5]!.gross).toBe(p.monthlyGross);
  }));

  it("a mid-month start has a part first month", () => each((c) => {
    const p = hireCostPreview(c, input(c, { startIso: "2027-02-15" }));
    expect(p.months[0]!.part).toBe(true);
    expect(p.months[0]!.gross).toBeLessThan(p.monthlyGross);
    expect(p.months[1]!.gross).toBe(p.monthlyGross);
  }));

  it("the employer side is not computed, never a silent zero",
    () => each((c) => {
      const exp = hireCostPreview(c, input(c));
      expect(exp.employer.status).toBe("not-computed");
      const nat = hireCostPreview(c, input(c, { national: true }));
      expect(nat.employer).toEqual({ status: "not-computed",
        note: "Pension: Not computed." });
    }));

  it("placeholders are labelled demo estimates and kept apart",
    () => each((c) => {
      const exp = hireCostPreview(c, input(c));
      expect(exp.placeholders).toHaveLength(3);
      for (const x of exp.placeholders) expect(x.note).toMatch(/Demo est/);
      expect(exp.firstYearTotal)
        .toBe(exp.firstYearGross + exp.placeholdersTotal);
      const nat = hireCostPreview(c, input(c, { national: true }));
      expect(nat.placeholders.map((x) => x.label))
        .toEqual(["Health insurance, first year"]);
    }));

  it("compares with the department's 2027 plan", () => each((c) => {
    const p = hireCostPreview(c, input(c));
    const plan = workforcePlan(c).rows.find((r) =>
      r.departmentId === p.budget!.departmentId)!;
    expect(p.budget!.planned).toBe(plan.budget.total);
    expect(p.budget!.withHire).toBe(plan.budget.total + p.budget!.hireInYear);
    expect(p.budget!.hireInYear).toBe(sum(p.months.filter((m) =>
      m.month.startsWith("2027")).map((m) => m.gross)));
  }));

  it("says what is wrong with the entry", () => each((c) => {
    expect(hireCostPreview(c, input(c, { jobKey: "nope" })).problems)
      .toEqual(["Choose a role."]);
    expect(hireCostPreview(c, input(c, { grade: 10 })).problems[0])
      .toMatch(/Choose a grade/);
    expect(hireCostPreview(c, input(c, { startIso: "2026-10-01" }))
      .problems[0]).toMatch(/must be after/);
    expect(hireCostPreview(c, input(c, { startIso: "" })).problems)
      .toEqual(["Enter a start date."]);
    expect(hireCostPreview(c, input(c, { startIso: "2028-01-05" }))
      .problems[0]).toMatch(/runs to/);
    expect(hireCostPreview(c, input(c, { startIso: "2027-02-30" }))
      .problems).toEqual(["Enter a start date."]);
  }));

  it("wording has no banned authority words", () => each((c) => {
    const p = hireCostPreview(c, input(c));
    expect(asText({ b: p.basis, bb: p.budget!.basis, pl: p.placeholders,
      e: p.employer })).not.toMatch(BANNED_WORDS);
  }));

  it("every role is priced", () => each((c) => {
    for (const r of hireRoles(c)) {
      const p = hireCostPreview(c, { jobKey: r.jobKey, grade: r.gradeMax,
        startIso: "2027-03-01", national: false });
      expect(p.problems).toEqual([]);
      expect(p.monthlyGross).toBeGreaterThan(fils(0n));
    }
  }));
});

describe("WPE checks: report templates", () => {
  it("six templates with unique ids and one-line questions", () => {
    expect(REPORT_TEMPLATES).toHaveLength(6);
    expect(new Set(REPORT_TEMPLATES.map((t) => t.id)).size).toBe(6);
    for (const t of REPORT_TEMPLATES) {
      expect(t.asks.length).toBeLessThanOrEqual(80);
      expect(asText(t)).not.toMatch(BANNED_WORDS);
    }
  });

  it("filters take the months and departments of the data", () => each((c) => {
    const ch = templateChoices(c);
    expect(ch.months[0]!.value).toBe("2026-10");
    expect(ch.months.at(-1)!.value).toBe("2026-02");
    expect(ch.departments).toHaveLength(c.departments.length);
  }));
});
