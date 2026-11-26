import {
  calculateProbation,
  EMPLOYMENT_PACKS,
} from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  AS_OF,
  approvalsInbox,
  appraisalCycleViews,
  appraisalViews,
  buildDemoCompany,
  costCentreViews,
  departmentPerformance,
  directReportsOf,
  employeeById,
  employeesWithCase,
  goalViews,
  headline,
  jobTitleText,
  managerIdFor,
  orgChart,
  peopleOverview,
  positionViews,
  positionsByDepartment,
  probationEvaluationViews,
  reportingLineOf,
  requisitionViews,
  staffAcrossSites,
  teamProbationOf,
  vacancyViews,
  type DemoCompany,
} from "../src/index";
import { BASIC_STEP, GRADE_BASIC } from "../src/roster-data";
import { BACK_PAY_RAISE } from "../src/roster";

const SEEDS = [1, 2026, 7777];
const built = new Map<number, DemoCompany>(SEEDS.map((s) =>
  [s, buildDemoCompany(s)]));
const each = (fn: (c: DemoCompany) => void) => {
  for (const s of SEEDS) fn(built.get(s)!);
};
const ISO = /\d{4}-\d{2}-\d{2}/;
const active = (c: DemoCompany) => c.employees.filter((e) =>
  e.joiningDate <= AS_OF && (e.leavingDate === null ||
    e.leavingDate >= AS_OF));

describe("WP2 org chart", () => {
  it("has the General Manager on top and everyone active once", () => each(
    (c) => {
    const root = orgChart(c);
    expect(root.employeeId).toBe(c.employees.find((e) =>
      e.jobKey === "general-manager")!.id);
    const ids: string[] = [];
    const walk = (n: typeof root) => {
      ids.push(n.employeeId);
      n.children.forEach(walk);
    };
    walk(root);
    expect(ids.sort()).toEqual(active(c).map((e) => e.id).sort());
    expect(ids).toHaveLength(c.nationalities.headcount);
    expect(c.nationalities.headcountText).toContain(`${ids.length} active`);
    const leaver = employeesWithCase(c, "leaver")[0]!;
    expect(ids).not.toContain(leaver.id);
  }));

  it("each person reports to someone senior, in at most 3 levels", () =>
    each((c) => {
    for (const e of active(c)) {
      const line = reportingLineOf(c, e.id);
      expect(line.length).toBeLessThanOrEqual(2);
      const boss = line[0];
      if (e.jobKey === "general-manager") {
        expect(boss).toBeUndefined();
        continue;
      }
      expect(employeeById(c, boss!.employeeId).grade).toBeGreaterThan(
        e.grade);
      expect(line.at(-1)!.title).toBe("General manager");
      expect(directReportsOf(c, boss!.employeeId).map((x) => x.employeeId))
        .toContain(e.id);
    }
  }));

  it("agrees with the approvals inbox: the manager decides", () => each(
    (c) => {
    for (const a of approvalsInbox(c)) {
      if (a.kind === "pay-run") continue;
      expect(managerIdFor(c.employees, employeeById(c, a.employeeId!)))
        .toBe(a.checkerEmployeeId);
    }
    const run = approvalsInbox(c).find((a) => a.kind === "pay-run")!;
    expect(managerIdFor(c.employees, employeeById(c,
      run.makerEmployeeId))).toBe(run.checkerEmployeeId);
  }));

  it("branch staff report to their own branch manager", () => each((c) => {
    for (const e of active(c).filter((x) => x.departmentId ===
      "dept-retail" && x.grade < 7)) {
      const boss = employeeById(c, reportingLineOf(c, e.id)[0]!.employeeId);
      expect(boss.jobKey).toBe("branch-manager");
      expect(boss.location).toBe(e.location);
    }
  }));
});

describe("WP2 positions and headcount", () => {
  it("one seat per employee, filled for the 30 active, one vacant", () =>
    each((c) => {
    const ps = positionViews(c);
    expect(new Set(ps.map((p) => p.id)).size).toBe(ps.length);
    const filled = ps.filter((p) => p.status === "filled");
    expect(filled.map((p) => p.incumbentId).sort())
      .toEqual(active(c).map((e) => e.id).sort());
    const leaver = employeesWithCase(c, "leaver")[0]!;
    const seat = ps.find((p) => p.id === `pos-${leaver.id.slice(4)}`)!;
    expect(seat.status).toBe("vacant");
    expect(seat.incumbentId).toBeNull();
    expect(seat.formerIncumbentName).toBe(leaver.fullName);
    expect(seat.vacantSince!.iso).toBe("2026-10-16");
    expect(seat.requisitionId).toBe("req-002");
    for (const p of filled) {
      const e = employeeById(c, p.incumbentId!);
      expect(p.departmentId).toBe(e.departmentId);
      expect(p.location).toBe(e.location);
      expect(p.grade).toBe(e.grade);
      expect(p.title).toBe(jobTitleText(e.jobKey));
      expect(e.basicMonthly >= GRADE_BASIC[e.grade]!).toBe(true);
      expect(e.basicMonthly <= GRADE_BASIC[e.grade]! + 8n * BASIC_STEP)
        .toBe(true);
      expect(p.basicMin.value).toBe(GRADE_BASIC[e.grade]);
    }
  }));

  it("the vacant and on-hold seats are the requisitions' seats", () =>
    each((c) => {
    const ps = positionViews(c);
    for (const r of requisitionViews(c).filter((x) =>
      x.status !== "filled")) {
      for (const id of r.positionIds) {
        const p = ps.find((x) => x.id === id)!;
        expect(p.requisitionId).toBe(r.id);
        expect(p.status).toBe(r.status === "on-hold" ? "on-hold"
          : "vacant");
        expect(p.departmentId).toBe(r.departmentId);
        expect(p.grade).toBe(r.grade);
        expect(p.reportsToPositionId).toBe(`pos-${r.hiringManagerId
          .slice(4)}`);
      }
    }
    expect(ps.filter((p) => p.status === "vacant" && p.requisitionId !==
      null).length).toBe(vacancyViews(c).reduce((n, v) =>
      n + v.positionIds.length, 0));
    const pending = ps.find((p) => p.id === "pos-new-1")!;
    expect(pending.pendingHire).toContain("joins on 16 Nov 2026");
  }));

  it("department counts add up to the seats and the headcount", () => each(
    (c) => {
    const rows = positionsByDepartment(c);
    expect(rows).toHaveLength(c.departments.length);
    expect(rows.reduce((n, r) => n + r.filled, 0))
      .toBe(c.nationalities.headcount);
    for (const r of rows) {
      expect(r.budgeted).toBe(r.filled + r.vacant);
      expect(r.text).toContain(String(r.filled));
    }
    expect(rows.reduce((n, r) => n + r.onHold, 0)).toBe(1);
    expect(rows.reduce((n, r) => n + r.vacant, 0)).toBe(1 + 2);
  }));

  it("staff across sites and cost centres reuse the run's figures", () =>
    each((c) => {
    const sites = staffAcrossSites(c);
    expect(sites.reduce((n, s) => n + s.headcount, 0))
      .toBe(c.nationalities.headcount);
    for (const s of sites) {
      expect(s.headcount).toBe(active(c).filter((e) =>
        e.location === s.location).length);
      expect(s.byDepartment.reduce((n, d) => n + d.count, 0))
        .toBe(s.headcount);
    }
    const cc = costCentreViews(c);
    expect(cc.reduce((n, x) => n + x.monthlyGross.value, 0n))
      .toBe(headline(c).gross);
    expect(new Set(cc.map((x) => x.code)).size).toBe(cc.length);
  }));

  it("the overview matches the lists", () => each((c) => {
    const o = peopleOverview(c);
    expect(o.headcount).toBe(c.nationalities.headcount);
    expect(o.uaeNationals).toBe(c.nationalities.uaeNationals);
    expect(o.headcountText).toBe(c.nationalities.headcountText);
    expect(o.joinedThisMonth.map((x) => x.employeeId))
      .toEqual(employeesWithCase(c, "probation").map((e) => e.id));
    expect(o.leftThisMonth.map((x) => x.employeeId))
      .toEqual(employeesWithCase(c, "leaver").map((e) => e.id));
    expect(o.openVacancies).toBe(vacancyViews(c).length);
    expect(o.onProbation).toBe(active(c).filter((e) =>
      e.probationEndDate !== null && e.probationEndDate >= AS_OF).length);
  }));
});

describe("WP2 appraisals", () => {
  it("only people in the cycle are appraised, ratings are 1 to 5", () =>
    each((c) => {
    const cycles = appraisalCycleViews(c);
    expect(cycles.map((x) => x.id)).toEqual(["cyc-2025", "cyc-2026-mid",
      "cyc-2026"]);
    for (const cy of cycles) {
      const rows = appraisalViews(c, { cycleId: cy.id });
      expect(rows).toHaveLength(cy.eligible);
      for (const a of rows) {
        const e = employeeById(c, a.employeeId);
        expect(e.joiningDate <= cy.eligibleJoinedBy.iso).toBe(true);
        expect(e.leavingDate === null || e.leavingDate > cy.periodEnd.iso)
          .toBe(true);
        if (a.rating !== null) {
          expect(a.rating).toBeGreaterThanOrEqual(1);
          expect(a.rating).toBeLessThanOrEqual(5);
          expect(a.ratingText.length).toBeGreaterThan(3);
        }
        expect(a.reviewerId).toBe(managerIdFor(c.employees, e));
      }
    }
    const open = appraisalViews(c, { cycleId: "cyc-2026" });
    const leaver = employeesWithCase(c, "leaver")[0]!;
    const hire = employeesWithCase(c, "probation")[0]!;
    expect(open.map((a) => a.employeeId)).not.toContain(leaver.id);
    expect(open.map((a) => a.employeeId)).not.toContain(hire.id);
    expect(appraisalViews(c, { cycleId: "cyc-2026-mid" })
      .map((a) => a.employeeId)).toContain(leaver.id);
    expect(open.every((a) => a.status !== "finalised")).toBe(true);
    expect(open.some((a) => a.status === "self-done")).toBe(true);
    for (const a of open.filter((x) => x.status === "self-done")) {
      expect(a.selfRating).not.toBeNull();
    }
    const cy = cycles.find((x) => x.id === "cyc-2026")!;
    expect(cy.selfDueOn.iso > AS_OF).toBe(true);
    expect(cy.opensOn.iso <= AS_OF).toBe(true);
    const done = appraisalViews(c, { cycleId: "cyc-2025" });
    expect(done.every((a) => a.status === "finalised" &&
      a.rating !== null)).toBe(true);
  }));

  it("the back-pay case's raise came out of the mid-year review", () =>
    each((c) => {
    const e = employeesWithCase(c, "back-pay")[0]!;
    const a = appraisalViews(c, { cycleId: "cyc-2026-mid",
      employeeId: e.id })[0]!;
    expect(a.rating).toBe(5);
    const r = a.salaryOutcome!;
    expect(r.increase.value).toBe(BACK_PAY_RAISE);
    expect(r.to.value).toBe(e.basicMonthly);
    expect(r.from.value).toBe(e.basicMonthly - BACK_PAY_RAISE);
    expect(r.effectiveOn.iso).toBe("2026-09-01");
    expect(r.effectiveOn.iso > a.finalisedOn!.iso).toBe(true);
    const others = appraisalViews(c).filter((x) => x.employeeId !== e.id);
    expect(others.every((x) => x.salaryOutcome === null)).toBe(true);
    const bp = c.payRun.backPay.find((b) => b.employeeId === e.id)!;
    expect(bp.amount > 0n).toBe(true);
  }));
});

describe("WP2 goals and department performance", () => {
  it("each employee's goal weights add up to 100", () => each((c) => {
    const goals = goalViews(c, { kind: "individual" });
    const by = new Map<string, number>();
    for (const g of goals) {
      by.set(g.employeeId!, (by.get(g.employeeId!) ?? 0) + g.weight);
      expect(g.progressPct).toBeGreaterThanOrEqual(0);
      expect(g.progressPct).toBeLessThanOrEqual(100);
      expect(g.dueOn.iso > AS_OF).toBe(true);
      const e = employeeById(c, g.employeeId!);
      expect(e.departmentId).toBe(g.departmentId);
      expect(g.progressText.length).toBeGreaterThan(5);
    }
    const eligible = appraisalViews(c, { cycleId: "cyc-2026" })
      .map((a) => a.employeeId).sort();
    expect([...by.keys()].sort()).toEqual(eligible);
    for (const w of by.values()) expect(w).toBe(100);
  }));

  it("status follows the pace of the year", () => each((c) => {
    for (const g of goalViews(c, { kind: "individual" })) {
      if (g.progressPct >= 100) expect(g.status).toBe("done");
      else expect(g.status).toBe(g.progressPct >= 72 ? "on-track"
        : "at-risk");
    }
    const statuses = new Set(goalViews(c).map((g) => g.status));
    expect(statuses.has("at-risk")).toBe(true);
    expect(statuses.has("on-track")).toBe(true);
  }));

  it("every department has its goals, the new hire has probation goals",
    () => each((c) => {
    const dept = goalViews(c, { kind: "department" });
    for (const d of c.departments) {
      expect(dept.filter((g) => g.departmentId === d.id)).toHaveLength(3);
    }
    const hire = employeesWithCase(c, "probation")[0]!;
    const mine = goalViews(c, { employeeId: hire.id });
    expect(mine.length).toBeGreaterThanOrEqual(2);
    expect(mine.every((g) => g.kind === "probation")).toBe(true);
    expect(mine.every((g) => g.dueOn.iso <= hire.probationEndDate!))
      .toBe(true);
  }));

  it("department performance covers all departments and rated people",
    () => each((c) => {
    const rows = departmentPerformance(c);
    expect(rows.map((r) => r.departmentId))
      .toEqual(c.departments.map((d) => d.id));
    const mid = appraisalViews(c, { cycleId: "cyc-2026-mid" });
    expect(rows.reduce((n, r) => n + r.rated, 0)).toBe(mid.length);
    for (const r of rows) {
      if (r.rated > 0) {
        expect(r.averageRating).toBeGreaterThanOrEqual(1);
        expect(r.averageRating).toBeLessThanOrEqual(5);
        expect(r.averageText).toMatch(/^\d\.\d\d out of 5$/);
      }
      expect(r.goalsOnTrack + r.goalsAtRisk + r.goalsDone)
        .toBe(r.goals);
    }
  }));
});

describe("WP2 probation evaluations", () => {
  it("one for each person with a probation end date", () => each((c) => {
    const ev = probationEvaluationViews(c);
    const want = c.employees.filter((e) => e.probationEndDate !== null);
    expect(ev.map((x) => x.employeeId).sort())
      .toEqual(want.map((e) => e.id).sort());
    for (const x of ev) {
      const e = employeeById(c, x.employeeId);
      expect(x.probationEnd.iso).toBe(e.probationEndDate);
      const engine = calculateProbation({ joiningDate: e.joiningDate,
        probationMonths: e.probationMonths }, EMPLOYMENT_PACKS).value;
      expect(x.decideBy.iso).toBe(engine.employerNoticeDeadline);
      if (e.probationEndDate! < AS_OF) {
        expect(x.status).toBe("confirmed");
        expect(x.scores).not.toBeNull();
        expect(x.evaluatedOn!.iso < x.probationEnd.iso).toBe(true);
        expect(x.evaluatedOn!.iso > e.joiningDate).toBe(true);
      } else {
        expect(x.status).toBe("in-progress");
        expect(x.evaluatedOn).toBeNull();
      }
      expect(x.evaluatorId).toBe(managerIdFor(c.employees, e));
    }
  }));

  it("the new hire's check-in and notes come from existing records", () =>
    each((c) => {
    const e = employeesWithCase(c, "probation")[0]!;
    const x = probationEvaluationViews(c).find((v) =>
      v.employeeId === e.id)!;
    expect(x.status).toBe("in-progress");
    expect(x.nextStep!.display).toBe("4 Nov 2026");
    expect(x.nextStepText).toContain("30-day check-in");
    const sick = c.leaveRequests.find((r) => r.employeeId === e.id &&
      r.leaveTypeId === "lt-sick")!;
    expect(sick.startDate).toBe("2026-10-20");
    expect(x.notes.join(" ")).toContain("20 Oct 2026");
    const ts = c.timesheets.find((t) => t.employeeId === e.id)!;
    expect(x.notes.join(" ")).toContain(`${ts.presentDays} days present`);
    expect(x.decideBy.iso > AS_OF).toBe(true);
    const boss = managerIdFor(c.employees, e)!;
    expect(teamProbationOf(c, boss).map((v) => v.employeeId))
      .toContain(e.id);
    expect(teamProbationOf(c, "emp-001").every((v) =>
      v.evaluatorId === "emp-001")).toBe(true);
  }));
});

describe("WP2 display strings", () => {
  it("no view carries a raw ISO date outside { iso, display }", () => each(
    (c) => {
    const json = JSON.stringify([orgChart(c), positionViews(c),
      positionsByDepartment(c), staffAcrossSites(c), costCentreViews(c),
      peopleOverview(c), appraisalCycleViews(c), appraisalViews(c),
      goalViews(c), departmentPerformance(c),
      probationEvaluationViews(c)], (_k, v) =>
      typeof v === "bigint" ? `${v}` : v);
    expect(json.replace(/"iso":"\d{4}-\d{2}-\d{2}"/g, ""))
      .not.toMatch(ISO);
  }));
});
