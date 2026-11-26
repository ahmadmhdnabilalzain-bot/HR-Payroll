import { addDays, daysBetween, formatAed } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  AS_OF,
  PAY_CALENDAR,
  approvalsInbox,
  buildDemoCompany,
  directReportsOf,
  duration,
  employeeById,
  employeesWithCase,
  homeNotificationsFor,
  homeNoticesFor,
  homeRolePersonas,
  homeSummary,
  homeTasksFor,
  homeTasksForEmployee,
  issuesOf,
  joinerChecklistViews,
  leaverChecklistView,
  managerIdFor,
  myDocumentViews,
  appraisalViews,
  payCalendar,
  teamToday,
  unreadNotificationCount,
  type DemoCompany,
  type HomeRole,
} from "../src/index";

const SEEDS = [1, 2026, 7777];
const built = new Map<number, DemoCompany>(SEEDS.map((s) =>
  [s, buildDemoCompany(s)]));
const each = (fn: (c: DemoCompany) => void) => {
  for (const s of SEEDS) fn(built.get(s)!);
};
const ISO = /\d{4}-\d{2}-\d{2}/;
const ROLES: HomeRole[] = ["hr", "gm", "it", "manager", "employee"];
const idOf = (c: DemoCompany, r: HomeRole) =>
  homeRolePersonas(c).find((p) => p.role === r)!.employeeId;

describe("WP10 role personas", () => {
  it("come from the data, as the demo's role switcher reads them", () =>
    each((c) => {
    const run = approvalsInbox(c).find((a) => a.kind === "pay-run")!;
    expect(idOf(c, "hr")).toBe(run.makerEmployeeId);
    expect(idOf(c, "gm")).toBe(run.checkerEmployeeId);
    const emp = employeesWithCase(c, "overtime")[0]!;
    expect(idOf(c, "employee")).toBe(emp.id);
    expect(idOf(c, "manager")).toBe(managerIdFor(c.employees, emp));
    expect(employeeById(c, idOf(c, "it")).jobKey).toBe("it-manager");
    expect(new Set(homeRolePersonas(c).map((p) => p.employeeId)).size)
      .toBe(5);
    expect(homeRolePersonas(c).map((p) => p.role)).toEqual(ROLES);
  }));
});

describe("WP10 tasks", () => {
  it("approval tasks are the approvals inbox, nothing more", () => each(
    (c) => {
    const all = c.employees.flatMap((e) => homeTasksForEmployee(c, e.id))
      .filter((t) => t.source.kind === "approval" && t.status === "open");
    expect(all.map((t) => t.source.id).sort())
      .toEqual(c.approvals.map((a) => a.id).sort());
    for (const a of c.approvals) {
      const t = all.find((x) => x.source.id === a.id)!;
      expect(t.assigneeId).toBe(a.checkerEmployeeId);
    }
    for (const r of ROLES) {
      const mine = homeTasksFor(c, r).filter((t) =>
        t.source.kind === "approval" && t.status === "open");
      expect(mine.map((t) => t.source.id).sort()).toEqual(
        approvalsInbox(c, idOf(c, r)).map((a) => a.id).sort());
    }
    const run = all.find((t) => t.source.id === "ap-001")!;
    expect(run.dueOn!.iso).toBe(PAY_CALENDAR.approveBy);
    expect(run.detail).toContain("pension");
    const exp = c.approvals.find((a) => a.kind === "expense")!;
    expect(all.find((t) => t.source.id === exp.id)!.detail)
      .toContain(formatAed(exp.amount!));
  }));

  it("every open checklist step is one open task for its owner", () => each(
    (c) => {
    const lists = [...joinerChecklistViews(c),
      leaverChecklistView(c, employeesWithCase(c, "leaver")[0]!.id)!];
    const tasks = c.employees.flatMap((e) =>
      homeTasksForEmployee(c, e.id)).filter((t) =>
      t.source.kind === "checklist");
    for (const l of lists) {
      for (const i of l.items) {
        const hits = tasks.filter((t) => t.source.id ===
          `${l.id}/${i.key}`);
        if (i.state === "done") {
          const recent = i.doneOn!.iso >= addDays(AS_OF, -14);
          expect(hits.length).toBe(recent ? 1 : 0);
          if (recent) expect(hits[0]!.status).toBe("done");
          continue;
        }
        expect(hits, `${l.id}/${i.key}`).toHaveLength(1);
        expect(hits[0]!.status).toBe("open");
        expect(hits[0]!.dueOn!.iso).toBe(i.dueOn.iso);
        expect(hits[0]!.urgency === "overdue").toBe(i.state === "overdue");
      }
    }
    const hr = homeTasksFor(c, "hr").find((t) =>
      t.source.id === "join-001/residence-id")!;
    expect(hr.dueText).toBe("Was due 19 Oct 2026, 8 days ago");
    expect(hr.priority).toBe("high");
    const it = homeTasksFor(c, "it").filter((t) => t.status === "open");
    expect(it.length).toBeGreaterThanOrEqual(2);
  }));

  it("the final settlement task is Finance's, with the run's figure", () =>
    each((c) => {
    const s = c.payRun.settlements[0]!;
    const due = payCalendar(c).settlementDue!;
    const finance = c.employees.find((e) =>
      e.jobKey === "finance-manager")!;
    const t = homeTasksForEmployee(c, finance.id).find((x) =>
      x.source.id === "leave-001/pay-settlement")!;
    expect(t.dueOn!.iso).toBe(due.iso);
    expect(t.title).toContain(employeeById(c, s.employeeId).fullName);
    expect(t.status).toBe("open");
    const mine = c.payRun.settlements.map((x) => formatAed(x.result.total));
    expect(mine.length).toBe(1);
  }));

  it("documents, bank details and offers become HR tasks", () => each(
    (c) => {
    const hr = homeTasksFor(c, "hr");
    for (const d of c.documents.filter((x) => x.daysLeft <= 90)) {
      const t = hr.find((x) => x.source.id === d.id)!;
      expect(t.dueOn!.iso).toBe(d.expiresOn);
      expect(t.title).toContain(employeeById(c, d.employeeId).fullName);
      const own = homeTasksForEmployee(c, d.employeeId).some((x) =>
        x.source.id === d.id);
      expect(own).toBe(d.daysLeft <= 30);
    }
    expect(hr.some((x) => x.source.id === c.documents.find((d) =>
      d.daysLeft > 90)!.id)).toBe(false);
    for (const tag of ["missing-iban", "iban-typo"] as const) {
      const e = employeesWithCase(c, tag)[0]!;
      expect(hr.some((x) => x.source.kind === "issue" &&
        x.subjectEmployeeId === e.id)).toBe(true);
    }
    const bankIssues = issuesOf(c).filter((i) => i.fixKind === "enter-iban"
      && i.kind === "issue");
    expect(hr.filter((x) => x.source.kind === "issue" &&
      x.subjectEmployeeId !== null)).toHaveLength(bankIssues.length);
    const offers = hr.filter((x) => x.source.kind === "offer");
    expect(offers.map((x) => x.source.id).sort())
      .toEqual(["offer-002", "offer-005"]);
  }));

  it("urgency and priority follow the due date; the list is sorted",
    () => each((c) => {
    for (const r of ROLES) {
      const ts = homeTasksFor(c, r);
      expect(ts.length).toBeGreaterThan(0);
      let prevOpen = true;
      let prevDue = "";
      let nulls = false;
      for (const t of ts) {
        expect(t.id).toMatch(/^task-/);
        if (t.status === "done") {
          expect(t.completedOn).not.toBeNull();
          prevOpen = false;
          continue;
        }
        expect(prevOpen).toBe(true);
        if (t.dueOn === null) {
          expect(t.urgency).toBe("none");
          nulls = true;
          continue;
        }
        expect(nulls).toBe(false);
        expect(t.dueOn.iso >= prevDue).toBe(true);
        prevDue = t.dueOn.iso;
        const n = daysBetween(AS_OF, t.dueOn.iso);
        expect(t.urgency).toBe(n < 0 ? "overdue" : n <= 7 ? "soon"
          : "later");
        expect(t.priority).toBe(n <= 3 ? "high" : "normal");
        expect(t.dueText).not.toMatch(ISO);
      }
    }
  }));

  it("appraisal and probation work lands with the right person", () =>
    each((c) => {
    const open = appraisalViews(c, { cycleId: "cyc-2026" });
    for (const a of open) {
      const mine = homeTasksForEmployee(c, a.employeeId).filter((t) =>
        t.source.kind === "appraisal" && t.assigneeId === a.employeeId &&
        t.title.startsWith("Complete"));
      expect(mine.length === 1).toBe(a.status === "not-started");
    }
    const waiting = open.filter((a) => a.status === "self-done" &&
      a.reviewerId !== null);
    const reviews = c.employees.flatMap((e) =>
      homeTasksForEmployee(c, e.id)).filter((t) =>
      t.source.kind === "appraisal" && t.title.startsWith("Review"));
    expect(reviews).toHaveLength(waiting.length);
    const hire = employeesWithCase(c, "probation")[0]!;
    const boss = managerIdFor(c.employees, hire)!;
    const check = homeTasksForEmployee(c, boss).find((t) =>
      t.source.id === "join-001/check-in")!;
    expect(check.dueOn!.iso).toBe(addDays(hire.joiningDate, 30));
    expect(check.title).toContain(hire.fullName);
  }));
});

describe("WP10 notifications", () => {
  it("are dated up to today, per role, with true figures", () => each(
    (c) => {
    for (const r of ROLES) {
      const ns = homeNotificationsFor(c, r);
      expect(ns.length, r).toBeGreaterThan(1);
      for (const n of ns) {
        expect(n.createdOn.iso <= AS_OF).toBe(true);
        expect(n.agoText).not.toMatch(ISO);
        expect(["info", "action", "warning"]).toContain(n.level);
      }
      expect(ns.map((n) => n.createdOn.iso)).toEqual(
        [...ns.map((n) => n.createdOn.iso)].sort().reverse());
      expect(unreadNotificationCount(c, r))
        .toBe(ns.filter((n) => !n.read).length);
    }
    const visa = c.documents.find((d) => d.employeeId === idOf(c,
      "employee"))!;
    const mine = homeNotificationsFor(c, "employee").find((n) =>
      n.source.id === visa.id)!;
    expect(mine.body).toContain(`${visa.daysLeft} days`);
    expect(mine.level).toBe("warning");
    const gm = homeNotificationsFor(c, "gm");
    for (const a of approvalsInbox(c, idOf(c, "gm"))) {
      expect(gm.some((n) => n.source.id === a.id && !n.read)).toBe(true);
    }
    const ot = c.timesheets.find((t) => t.employeeId === idOf(c,
      "employee"))!;
    expect(ot.overtimeMinutes).toBeGreaterThan(0);
    expect(homeNotificationsFor(c, "employee").some((n) =>
      n.body.includes(duration(ot.overtimeMinutes)))).toBe(true);
  }));

  it("never show a net pay figure without its pension caveat", () => each(
    (c) => {
    for (const r of ROLES) {
      for (const n of homeNotificationsFor(c, r)) {
        expect(`${n.title} ${n.body}`).not.toContain(formatAed(
          c.payRun.totals.net));
      }
    }
  }));
});

describe("WP10 notice board", () => {
  it("shows live notices for the person's place, pinned first", () => each(
    (c) => {
    for (const r of ROLES) {
      const ns = homeNoticesFor(c, r);
      expect(ns.length).toBeGreaterThanOrEqual(4);
      for (const n of ns) {
        expect(n.postedOn.iso <= AS_OF).toBe(true);
        expect(n.expiresOn === null || n.expiresOn.iso >= AS_OF).toBe(true);
        employeeById(c, n.postedBy.employeeId);
      }
      const pins = ns.map((n) => n.pinned);
      expect(pins).toEqual([...pins].sort((a, b) => Number(b) -
        Number(a)));
    }
    const all = homeNoticesFor(c, "hr").map((n) => n.title).join("|");
    expect(all).not.toContain("September payslips");
  }));

  it("states facts that match the data", () => each((c) => {
    const text = homeNoticesFor(c, "hr").map((n) =>
      `${n.title} ${n.body}`).join("\n");
    expect(text).toContain("30 Oct 2026");
    expect(PAY_CALENDAR.payday).toBe("2026-10-30");
    expect(text).toContain("22 Oct 2026");
    const hire = employeesWithCase(c, "probation")[0]!;
    expect(text).toContain(hire.fullName);
    const leaver = employeesWithCase(c, "leaver")[0]!;
    expect(text).toContain(leaver.fullName);
    expect(text).toContain("13 Nov 2026");
    const al = homeNoticesFor(c, "employee").some((n) =>
      n.audienceText.includes("Head office"));
    expect(al).toBe(employeeById(c, idOf(c, "employee")).location ===
      "hq-abu-dhabi");
  }));
});

describe("WP10 home summary, team today, documents", () => {
  it("the summary counts what the lists hold", () => each((c) => {
    for (const r of ROLES) {
      const s = homeSummary(c, r);
      const tasks = homeTasksFor(c, r).filter((t) => t.status === "open");
      expect(s.openTasks).toBe(tasks.length);
      expect(s.overdueTasks).toBe(tasks.filter((t) =>
        t.urgency === "overdue").length);
      expect(s.unreadNotifications).toBe(unreadNotificationCount(c, r));
      expect(s.pendingApprovals).toBe(approvalsInbox(c, idOf(c, r)).length);
      expect(s.notices).toBe(homeNoticesFor(c, r).length);
      expect(s.text).toContain(String(s.openTasks));
    }
    expect(["hr", "gm", "it", "manager", "employee"].reduce((n, r) =>
      n + homeSummary(c, r as HomeRole).pendingApprovals, 0))
      .toBeLessThanOrEqual(c.approvals.length);
  }));

  it("team today reads the attendance of the manager's own people", () =>
    each((c) => {
    const boss = idOf(c, "manager");
    const rows = teamToday(c, boss);
    expect(rows.map((r) => r.employeeId).sort())
      .toEqual(directReportsOf(c, boss).map((r) => r.employeeId).sort());
    for (const r of rows) {
      const day = c.attendance.find((a) => a.employeeId === r.employeeId &&
        a.date === AS_OF);
      expect(r.status).toBe(day?.status ?? "no-record");
      expect(r.statusText.length).toBeGreaterThan(3);
      expect(r.statusText).not.toMatch(ISO);
    }
    expect(rows.length).toBeGreaterThan(0);
  }));

  it("my documents match the expiry list with plain dates", () => each(
    (c) => {
    const id = idOf(c, "employee");
    const mine = myDocumentViews(c, id);
    expect(mine.map((d) => d.id).sort()).toEqual(c.documents
      .filter((d) => d.employeeId === id).map((d) => d.id).sort());
    for (const d of mine) {
      const src = c.documents.find((x) => x.id === d.id)!;
      expect(d.expiresOn.iso).toBe(src.expiresOn);
      expect(d.daysLeft).toBe(src.daysLeft);
      expect(d.text).not.toMatch(ISO);
    }
    expect(myDocumentViews(c).length).toBe(c.documents.length);
  }));

  it("no view carries a raw ISO date outside { iso, display }", () => each(
    (c) => {
    const json = JSON.stringify([ROLES.map((r) => [homeTasksFor(c, r),
      homeNotificationsFor(c, r), homeNoticesFor(c, r), homeSummary(c, r)]),
    homeRolePersonas(c), teamToday(c, idOf(c, "manager")),
    myDocumentViews(c)], (_k, v) => typeof v === "bigint" ? `${v}` : v);
    expect(json.replace(/"iso":"\d{4}-\d{2}-\d{2}"/g, ""))
      .not.toMatch(ISO);
  }));
});
