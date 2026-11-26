import { describe, expect, it } from "vitest";
import {
  AS_OF,
  buildDemoCompany,
  candidateBoard,
  employeeById,
  employeesWithCase,
  employmentEndView,
  hiringSummary,
  joinerChecklistViews,
  leaverChecklistView,
  moveViews,
  offerLetterText,
  offerViews,
  payCalendar,
  requisitionViews,
  shortDateText,
  vacancyViews,
  type DemoCompany,
} from "../src/index";
import { BASIC_STEP, GRADE_BASIC, GRADE_TRANSPORT } from
  "../src/roster-data";

const SEEDS = [1, 2026, 7777];
const built = new Map<number, DemoCompany>(SEEDS.map((s) =>
  [s, buildDemoCompany(s)]));
const each = (fn: (c: DemoCompany) => void) => {
  for (const s of SEEDS) fn(built.get(s)!);
};
const ISO = /\d{4}-\d{2}-\d{2}/;
const sumAllowances = (xs: { monthly: bigint }[]) =>
  xs.reduce((n, a) => n + a.monthly, 0n);

describe("WP3 dates", () => {
  it("shortDateText reads like 27 Oct 2026", () => {
    expect(shortDateText("2026-10-27")).toBe("27 Oct 2026");
    expect(shortDateText("2026-12-01")).toBe("1 Dec 2026");
    expect(shortDateText("2019-03-10")).toBe("10 Mar 2019");
  });
});

describe("WP3 offers", () => {
  it("the accepted offer for the new hire equals the record", () => each(
    (c) => {
    const e = employeesWithCase(c, "probation")[0]!;
    const o = offerViews(c).find((x) => x.employeeId === e.id)!;
    expect(o.status).toBe("accepted");
    expect(o.basic).toBe(e.basicMonthly);
    expect(o.allowances.map((a) => [a.code, a.monthly]))
      .toEqual(e.allowances.map((a) => [a.code, a.monthly]));
    expect(o.joiningDate.iso).toBe(e.joiningDate);
    expect(o.probationMonths).toBe(e.probationMonths);
    expect(o.respondedOn!.iso < e.joiningDate).toBe(true);
    expect(o.gross).toBe(e.basicMonthly + sumAllowances(e.allowances));
  }));

  it("open offers are priced from the grade band and start later",
    () => each((c) => {
    const open = offerViews(c).filter((o) => o.employeeId === null);
    expect(open.length).toBeGreaterThanOrEqual(3);
    for (const o of open) {
      const r = requisitionViews(c).find((x) => x.id === o.requisitionId)!;
      expect(o.basic).toBe(GRADE_BASIC[r.grade]);
      expect(o.basic >= r.basicMin.value && o.basic <= r.basicMax.value)
        .toBe(true);
      const housing = o.allowances.find((a) => a.code === "housing")!;
      expect(housing.monthly).toBe(o.basic * 40n / 100n);
      const t = o.allowances.find((a) => a.code === "transport")!;
      expect(t.monthly).toBe(GRADE_TRANSPORT[r.grade]);
      expect(o.joiningDate.iso > AS_OF).toBe(true);
      if (o.status === "sent") {
        expect(o.validUntil!.iso >= AS_OF).toBe(true);
      }
    }
    const statuses = new Set(offerViews(c).map((o) => o.status));
    for (const s of ["draft", "sent", "accepted", "declined"]) {
      expect(statuses.has(s as never)).toBe(true);
    }
  }));

  it("only the manager-grade offer needs the GM, and is approved", () =>
    each((c) => {
    for (const o of offerViews(c)) {
      if (o.status === "draft") {
        expect(o.approvedBy).toBeNull();
        continue;
      }
      const who = employeeById(c, o.approvedBy!.employeeId);
      expect(who.jobKey).toBe(o.grade >= 7 ? "general-manager"
        : "hr-manager");
      expect(o.approvedBy!.on.iso <= o.sentOn!.iso).toBe(true);
    }
  }));

  it("the letter text shows the figures and no raw dates", () => each(
    (c) => {
    for (const o of offerViews(c)) {
      const text = offerLetterText(c, o.id).join("\n");
      expect(text).toContain(o.number);
      expect(text).toContain(o.grossText);
      expect(text).toContain(o.joiningDate.display);
      expect(text).not.toMatch(ISO);
      expect(text).toContain("Zarqan Demo Bank");
      // A letter handed to a person carries no internal rule caveat.
      expect(text).not.toContain("as we read");
    }
  }));
});

describe("WP3 requisitions, vacancies and candidates", () => {
  it("each requisition fits the bank's own bands and people", () => each(
    (c) => {
    const rs = requisitionViews(c);
    expect(new Set(rs.map((r) => r.id)).size).toBe(rs.length);
    for (const r of rs) {
      expect(c.departments.some((d) => d.id === r.departmentId)).toBe(true);
      expect(r.basicMin.value).toBe(GRADE_BASIC[r.grade]);
      expect(r.basicMax.value)
        .toBe(GRADE_BASIC[r.grade]! + 8n * BASIC_STEP);
      const boss = employeeById(c, r.hiringManagerId);
      expect(boss.departmentId).toBe(r.departmentId);
      expect(boss.grade).toBeGreaterThan(r.grade - 1);
      expect(r.positionIds).toHaveLength(r.openings);
      expect(r.openedOn.iso <= AS_OF).toBe(true);
    }
  }));

  it("the backfill names the leaver, whose last day came first", () =>
    each((c) => {
    const leaver = employeesWithCase(c, "leaver")[0]!;
    const r = requisitionViews(c).find((x) =>
      x.replacesEmployeeId === leaver.id)!;
    expect(r.reason).toBe("backfill");
    expect(r.jobKey).toBe(leaver.jobKey);
    expect(r.departmentId).toBe(leaver.departmentId);
    expect(r.grade).toBe(leaver.grade);
    expect(r.positionIds).toEqual([`pos-${leaver.id.slice(4)}`]);
    const end = employmentEndView(c, leaver.id)!;
    expect(r.openedOn.iso > end.submittedOn.iso).toBe(true);
  }));

  it("the filled requisition is the new hire, open ones are not", () =>
    each((c) => {
    const e = employeesWithCase(c, "probation")[0]!;
    const filled = requisitionViews(c).filter((r) => r.status === "filled");
    expect(filled.map((r) => r.id)).toEqual(["req-001"]);
    expect(filled[0]!.jobKey).toBe(e.jobKey);
    expect(filled[0]!.location).toBe(e.location);
    expect(filled[0]!.grade).toBe(e.grade);
    expect(filled[0]!.positionIds).toEqual([`pos-${e.id.slice(4)}`]);
    const board = candidateBoard(c);
    const hired = board.columns.find((x) => x.stage === "hired")!;
    expect(hired.candidates.map((x) => x.employeeId)).toEqual([e.id]);
    expect(hired.candidates[0]!.name).toBe(e.fullName);
    expect(hired.candidates[0]!.nationality).toBe(e.nationality);
  }));

  it("vacancies are the open, published requisitions", () => each((c) => {
    const v = vacancyViews(c);
    expect(v.length).toBeGreaterThanOrEqual(2);
    for (const x of v) {
      expect(x.status).toBe("open");
      expect(x.published).toBe(true);
      expect(x.openingsLeft).toBeGreaterThan(0);
    }
    const on = requisitionViews(c).find((r) => r.status === "on-hold")!;
    expect(v.map((x) => x.id)).not.toContain(on.id);
  }));

  it("candidates are fictional, unique and sit on real requisitions",
    () => each((c) => {
    const names = new Set(c.employees.map((e) => e.fullName));
    const board = candidateBoard(c);
    const all = [...board.columns.flatMap((x) => x.candidates),
      ...board.closed];
    expect(all.length).toBeGreaterThanOrEqual(12);
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    const rs = new Set(requisitionViews(c).map((r) => r.id));
    for (const x of all) {
      expect(rs.has(x.requisitionId)).toBe(true);
      if (x.employeeId === null) expect(names.has(x.name)).toBe(false);
      expect(x.appliedOn.iso <= AS_OF).toBe(true);
      for (const i of x.interviews) {
        if (i.outcome !== "scheduled") expect(i.date.iso <= AS_OF).toBe(true);
        else expect(i.date.iso > AS_OF).toBe(true);
        for (const p of i.panel) employeeById(c, p.employeeId);
      }
    }
    expect(board.columns.map((x) => x.stage)).toEqual(["applied",
      "screening", "interview", "offer", "hired"]);
    expect(board.closed.map((x) => x.stage).sort()).toEqual(
      ["rejected", "rejected", "withdrawn", "withdrawn"]);
  }));

  it("each offer belongs to a candidate and the stages agree", () => each(
    (c) => {
    const board = candidateBoard(c);
    const all = [...board.columns.flatMap((x) => x.candidates),
      ...board.closed];
    for (const o of offerViews(c)) {
      const cand = all.find((x) => x.id === o.candidateId)!;
      expect(cand.requisitionId).toBe(o.requisitionId);
      expect(cand.offerId).toBe(o.id);
      if (o.status === "declined") expect(cand.stage).toBe("withdrawn");
      if (o.employeeId !== null) expect(cand.stage).toBe("hired");
    }
  }));

  it("the summary counts what the lists show", () => each((c) => {
    const s = hiringSummary(c);
    expect(s.openRequisitions).toBe(requisitionViews(c)
      .filter((r) => r.status === "open").length);
    expect(s.candidatesInProcess).toBe(candidateBoard(c).columns
      .filter((x) => x.stage !== "hired")
      .reduce((n, x) => n + x.candidates.length, 0));
    expect(s.offersOut).toBe(offerViews(c)
      .filter((o) => o.status === "sent").length);
    expect(s.text).toContain(String(s.openRequisitions));
  }));
});

describe("WP3 joiner and leaver checklists", () => {
  it("the new hire's checklist follows the joining date and IBAN", () =>
    each((c) => {
    const e = employeesWithCase(c, "probation")[0]!;
    const l = joinerChecklistViews(c).find((x) => x.employeeId === e.id)!;
    expect(l.joiningDate.iso).toBe(e.joiningDate);
    const bank = l.items.find((i) => i.key === "bank-details")!;
    expect(bank.state === "done").toBe(e.iban !== null);
    expect(l.items.every((i) => i.dueOn.iso >= "2026-09-30")).toBe(true);
    const overdue = l.items.filter((i) => i.state === "overdue");
    expect(overdue.map((i) => i.key)).toEqual(["residence-id"]);
    for (const i of l.items) {
      if (i.state === "done") expect(i.doneOn!.iso <= AS_OF).toBe(true);
      else expect(i.doneOn).toBeNull();
    }
    expect(l.progressText).toBe(`${l.items.filter((i) =>
      i.state === "done").length} of ${l.items.length} done`);
  }));

  it("the re-joiner has a pre-joining checklist, all dates ahead", () =>
    each((c) => {
    const l = joinerChecklistViews(c).find((x) => x.employeeId === null)!;
    expect(l.joiningDate.iso > AS_OF).toBe(true);
    expect(l.items.some((i) => i.state === "done")).toBe(true);
    for (const i of l.items.filter((x) => x.state !== "done")) {
      expect(i.dueOn.iso > AS_OF).toBe(true);
    }
  }));

  it("the leaver's checklist matches the settlement and its due date",
    () => each((c) => {
    const e = employeesWithCase(c, "leaver")[0]!;
    const l = leaverChecklistView(c, e.id)!;
    expect(l.lastWorkingDay.iso).toBe(e.leavingDate);
    expect(l.settlement.total.value).toBe(c.payRun.settlements[0]!
      .result.total);
    expect(l.settlement.dueOn.iso).toBe(payCalendar(c).settlementDue!.iso);
    const paid = l.items.find((i) => i.key === "pay-settlement")!;
    expect(paid.state).toBe("open");
    expect(paid.dueOn.iso).toBe(l.settlement.dueOn.iso);
    expect(l.items.find((i) => i.key === "calculate-settlement")!.state)
      .toBe("done");
    expect(l.items.filter((i) => i.state === "overdue")).toHaveLength(0);
    expect(leaverChecklistView(c, "emp-001")).toBeNull();
  }));

  it("the ending record gives the notice in days", () => each((c) => {
    const e = employeesWithCase(c, "leaver")[0]!;
    const x = employmentEndView(c, e.id)!;
    expect(x.kind).toBe("resignation");
    expect(x.lastWorkingDay.iso).toBe(e.leavingDate);
    expect(x.noticeDays).toBe(31);
    expect(x.noticeText).toBe("31 days of notice, from 14 Sep 2026 " +
      "to 15 Oct 2026");
    expect(employeeById(c, x.acceptedBy.employeeId).jobKey)
      .toBe("general-manager");
    expect(employmentEndView(c, "emp-001")).toBeNull();
  }));
});

describe("WP3 transfers and re-joins", () => {
  it("done transfers match the record, upcoming ones start in Nov",
    () => each((c) => {
    const ms = moveViews(c);
    const done = ms.filter((m) => m.kind === "transfer" &&
      m.status === "completed");
    expect(done.length).toBeGreaterThanOrEqual(2);
    for (const m of done) {
      const e = employeeById(c, m.employeeId!);
      expect(m.to.departmentId).toBe(e.departmentId);
      expect(m.to.location).toBe(e.location);
      expect(m.to.jobKey).toBe(e.jobKey);
      expect(m.to.grade).toBe(e.grade);
      expect(m.effectiveOn.iso >= "2026-01-01").toBe(true);
      expect(m.effectiveOn.iso <= "2026-09-30").toBe(true);
      expect(m.effectiveOn.iso > e.joiningDate).toBe(true);
      expect(m.payChangeText).toBe("No change in pay");
    }
    const next = ms.filter((m) => m.kind === "transfer" &&
      m.status === "approved");
    expect(next.length).toBeGreaterThanOrEqual(1);
    for (const m of next) {
      const e = employeeById(c, m.employeeId!);
      expect(m.from.departmentId).toBe(e.departmentId);
      expect(m.from.location).toBe(e.location);
      expect(m.from.jobKey).toBe(e.jobKey);
      expect(m.from.grade).toBe(e.grade);
      expect(m.effectiveOn.iso >= "2026-11-01").toBe(true);
    }
  }));

  it("the re-join is a former colleague outside the 31 staff", () => each(
    (c) => {
    const r = moveViews(c).find((m) => m.kind === "rejoin")!;
    expect(r.employeeId).toBeNull();
    expect(c.employees.some((e) => e.fullName === r.personName)).toBe(false);
    expect(r.effectiveOn.iso > AS_OF).toBe(true);
    const o = offerViews(c).find((x) => x.id === r.offerId)!;
    expect(o.status).toBe("accepted");
    expect(o.joiningDate.iso).toBe(r.effectiveOn.iso);
    expect(r.previousService!.to.iso < r.effectiveOn.iso).toBe(true);
    expect(r.previousService!.text).toMatch(/^\d{1,2} \w{3} \d{4} to /);
    expect(r.note).toContain("re-joining date");
  }));

  it("no view carries a raw ISO date outside { iso, display }", () =>
    each((c) => {
    const json = JSON.stringify([requisitionViews(c), vacancyViews(c),
      candidateBoard(c), offerViews(c), joinerChecklistViews(c),
      moveViews(c), hiringSummary(c)], (_k, v) =>
      typeof v === "bigint" ? `${v}` : v);
    const stripped = json.replace(/"iso":"\d{4}-\d{2}-\d{2}"/g, "");
    expect(stripped).not.toMatch(ISO);
  }));
});
