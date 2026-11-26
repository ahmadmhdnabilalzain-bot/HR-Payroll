import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import {
  budgetAskSeeds,
  budgetPackage,
  budgetStatusOf,
  budgetTotals,
  HIRING_BUDGET_BASIS,
  buildDemoCompany,
  checkRequest,
  criteriaTemplate,
  daysToFillLeft,
  headline,
  hiringBudget,
  hiringRequests,
  hiringTimeline,
  hireCostPreview,
  jobDescriptionTemplate,
  managerIdFor,
  positionCost,
  positionViews,
  REQUEST_BASIS,
  salaryBand,
  stagesTemplate,
  startTooSoon,
  timelineProgress,
  type DemoCompany,
  type RequestDraft,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const sum = (xs: readonly bigint[]) => xs.reduce((n, x) => n + x, 0n);
const managerOf = (c: DemoCompany): string => {
  const e = c.employees.find((x) => x.cases.includes("overtime"))!;
  return managerIdFor(c.employees, e)!;
};
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
/** Display strings only: drop the iso fields, then look for ISO. */
const shown = (x: unknown): string => JSON.stringify(x, (k, v: unknown) =>
  k === "iso" || k.endsWith("Iso") || k === "month" ? undefined
    : typeof v === "bigint" ? String(v) : v);

describe("WPE hiring: pure rules", () => {
  it("a seat's status follows its requisition and candidates", () => {
    expect(budgetStatusOf({ requisition: null, stages: [], taken: false }))
      .toBe("budgeted");
    expect(budgetStatusOf({ requisition: "on-hold", stages: ["applied"],
      taken: false })).toBe("budgeted");
    expect(budgetStatusOf({ requisition: "open", stages: ["applied",
      "screening"], taken: false })).toBe("open");
    expect(budgetStatusOf({ requisition: "open", stages: ["interview"],
      taken: false })).toBe("in-hiring");
    expect(budgetStatusOf({ requisition: "open", stages: [],
      taken: true })).toBe("filled");
  });

  it("progress reads the furthest stage and the offers", () => {
    expect(timelineProgress({ published: true, stages: ["screening"],
      offers: [], filled: false })).toEqual({ posted: true,
      shortlist: false, interviews: false, offer: false, start: false });
    expect(timelineProgress({ published: false, stages: ["interview",
      "rejected"], offers: ["sent"], filled: false })).toEqual({
      posted: true, shortlist: true, interviews: true, offer: true,
      start: false });
    expect(timelineProgress({ published: false, stages: [], offers: [],
      filled: true }).start).toBe(true);
  });

  it("milestones count from the sign-off; late ones are overdue", () => {
    const none = { posted: false, shortlist: false, interviews: false,
      offer: false, start: false };
    const t = hiringTimeline({ signedOffIso: "2026-09-18",
      timeToFillDays: 60, startIso: "2026-12-01",
      progress: { ...none, posted: true } }, "2026-10-27");
    expect(t.map((m) => m.key)).toEqual(["posted", "shortlist",
      "interviews", "offer", "start"]);
    expect(t[0]!.state).toBe("done");
    expect(t[1]!.due!.display).toBe("9 Oct 2026");
    expect(t[1]!.state).toBe("overdue");
    expect(t[1]!.text).toBe("18 days overdue, was due 9 Oct 2026");
    expect(t[3]!.text).toBe("Due 17 Nov 2026, in 21 days");
    expect(t[4]!.due!.display).toBe("1 Dec 2026");
    const before = hiringTimeline({ signedOffIso: null,
      timeToFillDays: 45, startIso: "2027-01-03", progress: none },
    "2026-10-27");
    expect(before[0]!.state).toBe("waiting");
    expect(before[4]!.state).toBe("due");
    expect(daysToFillLeft("2026-09-18", 60, "2026-10-27")).toBe(21);
    expect(daysToFillLeft(null, 60)).toBeNull();
  });

  it("a budget package is the roster's rule at a step", () => {
    const p = budgetPackage(7, 2);
    expect(p.basic).toBe(fils(2700000n + 50000n));
    expect(p.allowances.map((a) => a.code)).toEqual(["housing",
      "transport", "phone"]);
    expect(p.allowances[0]!.monthly).toBe(fils((2750000n * 40n) / 100n));
    expect(salaryBand(5)).toEqual({ min: fils(1500000n),
      max: fils(1700000n) });
    expect(() => budgetPackage(11, 0)).toThrow(/DEMO_NO_GRADE/);
  });
});

describe("WPE hiring: the budget", () => {
  it("every budget is a seat the position list already has", () =>
    each((c) => {
      const ids = new Set(positionViews(c).map((p) => p.id));
      const rows = hiringBudget(c);
      expect(rows).toHaveLength(5);
      for (const r of rows) expect(ids.has(r.positionId)).toBe(true);
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    }));

  it("statuses: filled, in hiring and budgeted", () => each((c) => {
    const by = new Map(hiringBudget(c).map((r) => [r.positionId, r]));
    expect(by.get("pos-new-1")!.status).toBe("filled");
    expect(by.get("pos-new-2")!.status).toBe("in-hiring");
    expect(by.get("pos-new-3")!.status).toBe("budgeted");
    expect(by.get("pos-new-3")!.budgetState).toBe("waiting");
    expect(by.get("pos-new-3")!.signedOff).toBeNull();
    expect(hiringBudget(c).filter((r) => r.status === "filled"))
      .toHaveLength(2);
  }));

  it("the first year is twelve engine months; at the foot it matches " +
    "the cost-of-hire preview", () => each((c) => {
    for (const r of hiringBudget(c)) {
      expect(r.cost.months).toHaveLength(12);
      expect(r.cost.firstYear).toBe(sum(r.cost.months.map((m) => m.gross)));
      expect(r.cost.monthly).toBe(sum(r.cost.parts.map((p) => p.monthly)));
    }
    const foot = positionCost(c, 5, 0, "2027-03-01");
    const prev = hireCostPreview(c, { jobKey: "credit-analyst", grade: 5,
      startIso: "2027-03-01", national: false });
    expect(foot.monthly).toBe(prev.monthlyGross);
    expect(foot.firstYear).toBe(prev.firstYearGross);
  }));

  it("spend: left is the budget less committed and offered", () =>
    each((c) => {
      const rows = hiringBudget(c);
      for (const r of rows) {
        expect(r.left).toBe(r.cost.firstYear -
          (r.committed?.amount ?? 0n) - (r.offered?.amount ?? 0n));
      }
      const t = budgetTotals(rows);
      expect(t.left).toBe(t.firstYear - t.committed - t.offered);
      expect(rows.find((r) => r.positionId === "pos-new-2")!.offered!.label)
        .toBe("Offer drafted");
    }));

  it("one budget change waits for the General manager", () => each((c) => {
    const a = budgetAskSeeds(c);
    expect(a).toHaveLength(1);
    expect(hiringBudget(c).some((r) => r.id === a[0]!.budgetId)).toBe(true);
  }));

  it("leaves the headline numbers alone", () => {
    const c = buildDemoCompany();
    const before = headline(c);
    hiringBudget(c);
    hiringRequests(c, managerOf(c));
    expect(headline(c)).toEqual(before);
    expect(String(before.net)).toBe("93373094");
  });
});

describe("WPE hiring: requests", () => {
  it("six requests: four linked, two waiting on HR and the GM", () =>
    each((c) => {
      const rs = hiringRequests(c, managerOf(c));
      expect(rs.map((r) => r.status)).toEqual(["filled", "open", "open",
        "on-hold", "with-hr", "with-gm"]);
      expect(rs.filter((r) => r.requisitionId !== null)).toHaveLength(4);
      expect(rs[4]!.raisedById).toBe(managerOf(c));
      expect(rs[4]!.departmentId).toBe(c.employees.find((e) =>
        e.id === managerOf(c))!.departmentId);
      expect(new Set(rs.map((r) => r.number)).size).toBe(6);
      for (const r of rs) {
        expect(r.events[0]!.text).toBe("Raised the request");
        expect(r.mustHave.length).toBeGreaterThan(0);
        expect(r.stages).toHaveLength(3);
        expect(r.signedOffIso === null).toBe(!["open", "filled"]
          .includes(r.status));
      }
    }));

  it("templates give a job description, criteria and stages", () =>
    each((c) => {
      const jd = jobDescriptionTemplate("credit-analyst", "dept-credit");
      expect(jd).toMatch(/^Credit analyst, Credit/);
      expect(jd).toMatch(/What you will do:/);
      expect(criteriaTemplate("teller").mustHave.length).toBeGreaterThan(0);
      const gm = c.employees.find((e) => e.jobKey === "general-manager")!;
      expect(stagesTemplate(c, gm.id)[2]!.panel).toHaveLength(1);
    }));

  it("says what is missing from a new request", () => each((c) => {
    const ok: RequestDraft = { jobKey: "teller",
      departmentId: "dept-retail", headcount: 1, startIso: "2027-01-10",
      timeToFillDays: 45, grade: 3,
      jobDescription: jobDescriptionTemplate("teller", "dept-retail"),
      mustHave: ["Two years at a bank counter"] };
    expect(checkRequest(c, ok)).toEqual([]);
    expect(checkRequest(c, { ...ok, jobKey: "x" })).toEqual(
      ["Choose a role."]);
    expect(checkRequest(c, { ...ok, startIso: "2026-10-01" })[0])
      .toMatch(/must be after 27 Oct 2026/);
    expect(checkRequest(c, { ...ok, headcount: 0 })[0]).toMatch(/1 to 5/);
    expect(checkRequest(c, { ...ok, timeToFillDays: 5 })[0])
      .toMatch(/14 to 120/);
    expect(checkRequest(c, { ...ok, mustHave: [" "] })[0])
      .toMatch(/must-have/);
    expect(checkRequest(c, { ...ok, jobDescription: "x" })[0])
      .toMatch(/job description/);
    expect(startTooSoon("2026-11-20", 45, "2026-10-27")).toBe(true);
    expect(startTooSoon("2027-01-20", 45, "2026-10-27")).toBe(false);
  }));

  it("words: no authority claims, no raw dates on show", () => each((c) => {
    const all = { b: hiringBudget(c), r: hiringRequests(c, managerOf(c)),
      a: budgetAskSeeds(c), x: [HIRING_BUDGET_BASIS, REQUEST_BASIS] };
    expect(asText(all)).not.toMatch(BANNED_WORDS);
    expect(asText(all)).not.toMatch(/\b(compliant|guaranteed)\b/i);
    expect(shown(all)).not.toMatch(ISO);
    expect(asText(all)).not.toMatch(/\bAED\b/);
  }));
});
