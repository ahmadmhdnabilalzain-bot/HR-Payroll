import { describe, expect, it } from "vitest";
import { contractProblems } from "../../src/components/explain/types";
import { buildDemoData } from "../../src/demo/data/adapter";
import { pendingApprovals, personOf } from "../../src/demo/derive";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import {
  allApprovals,
  annualNow,
  canSee,
  canSeePay,
  requestRows,
  visibleIds,
} from "../../src/demo/time-off";
import { en } from "../../src/i18n/en";
import { flatten } from "../../src/i18n/t";
import { filterPeople, shortBranch } from "../../src/people/filter";
import { halvesText } from "../../src/people/words";
import { nextWeek, problemOf } from "../../src/timeoff/draft";

const d = buildDemoData();
const P = d.people;
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });

describe("people", () => {
  it("lists-everyone-sorted-by-name", () => {
    const list = P.people();
    expect(list).toHaveLength(31);
    const names = list.map((x) => x.name.en);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("personas-come-from-the-data", () => {
    const p = P.personas();
    expect(p.hrId).toBe(d.runPeople().makerId);
    expect(p.gmId).toBe(d.runPeople().checkerId);
    expect(P.person(p.employeeId)?.role.en).toBe("Payments officer");
    expect(P.person(p.managerId)?.role.en).toBe("Operations manager");
    expect(personOf(d, "manager")).toBe(p.managerId);
  });

  it("approver-matches-the-package-and-is-never-the-person", () => {
    for (const a of d.approvalsInbox().filter((x) => x.kind === "leave")) {
      expect(P.approverOf(a.employeeId ?? "")).toBe(a.checkerId);
    }
    for (const x of P.people()) expect(x.approverId).not.toBe(x.id);
  });

  it("role-scopes-the-view", () => {
    expect(visibleIds(d, as("hr"))).toHaveLength(31);
    expect(visibleIds(d, as("employee")))
      .toEqual([P.personas().employeeId]);
    const team = visibleIds(d, as("manager"));
    expect(team).toContain(P.personas().employeeId);
    expect(team.every((id) => id === P.personas().managerId ||
      P.person(id)?.approverId === P.personas().managerId)).toBe(true);
    const other = P.people().find((x) => !team.includes(x.id));
    expect(canSee(d, as("manager"), other?.id ?? "")).toBe(false);
  });

  it("pay-is-hr-gm-or-self", () => {
    const jose = P.personas().employeeId;
    expect(canSeePay(d, as("hr"), "emp-001")).toBe(true);
    expect(canSeePay(d, as("manager"), jose)).toBe(false);
    expect(canSeePay(d, as("employee"), jose)).toBe(true);
  });

  it("payslip-lines-sum-to-gross-and-net", () => {
    for (const x of P.people()) {
      const s = P.payslip(x.id);
      if (s === null) continue;
      const sum = (g: string) => s.lines.filter((l) => l.group === g)
        .reduce((n, l) => n + l.amountFils, 0n);
      expect(sum("earning")).toBe(s.grossFils);
      expect(sum("deduction")).toBe(s.deductionsFils);
      expect(s.grossFils - s.deductionsFils).toBe(s.netFils);
      expect(s.pension !== null).toBe(x.uaeNational);
    }
  });

  it("every-payslip-figure-explains-within-the-contract", () => {
    for (const x of P.people()) {
      const s = P.payslip(x.id);
      if (s === null) continue;
      const ids = [...s.lines.map((l) => l.traceId), s.grossTraceId,
        s.deductionsTraceId, s.netTraceId,
        ...(s.pension === null ? [] : [s.pension.traceId])];
      for (const id of ids) {
        const e = P.explain(s.id, id, "Figure", "en");
        expect(contractProblems(e)).toEqual([]);
        expect(e.steps.map((x) => x.text).join(" "))
          .not.toMatch(/_|\d{5,}/);
      }
    }
  });

  it("filter-search-and-department", () => {
    const all = P.people();
    expect(filterPeople(all, "jose", null).map((x) => x.id))
      .toEqual(["emp-017"]);
    expect(filterPeople(all, "ZB-0017", null)).toHaveLength(1);
    const ops = filterPeople(all, "", "dept-ops");
    expect(ops.every((x) => x.departmentId === "dept-ops")).toBe(true);
    expect(filterPeople(all, "nobody here", null)).toEqual([]);
    expect(shortBranch("Khalidiya branch, Abu Dhabi (fictional)"))
      .toBe("Khalidiya branch");
  });
});

describe("time off", () => {
  it("engine-count-matches-the-package-requests", () => {
    for (const r of P.leaveRequests()) {
      expect(P.countDays(r.startDate, r.endDate).halves).toBe(r.halves);
    }
    expect(P.countDays("2026-11-20", "2026-11-23"))
      .toEqual({ halves: 4, weekendDays: 2 });
    expect(P.countDays("2026-11-23", "2026-11-20").halves).toBe(0);
  });

  it("balance-starts-at-the-package-figure", () => {
    const pkgLeaver = annualNow(d, INITIAL, "emp-014");
    expect(pkgLeaver?.availableDays).toBeCloseTo(18.71);
    expect(pkgLeaver?.basis).not.toBeNull();
    const rafiq = annualNow(d, INITIAL, "emp-018");
    expect(rafiq?.pendingHalves).toBe(10);
  });

  it("a-request-lands-in-the-approvers-inbox-and-moves-the-balance", () => {
    const jose = P.personas().employeeId;
    const before = annualNow(d, INITIAL, jose);
    let s = reduce(as("employee"), { type: "request-leave", draft: {
      employeeId: jose, leaveTypeId: "lt-annual", startDate: "2026-11-23",
      endDate: "2026-11-27", halves: 10, reasonKey: "reason.travel",
      note: "", requestedOn: P.asOf, checkerId: P.approverOf(jose) } });
    const mine = s.requests[0];
    expect(mine?.id).toBe("lr-new-1");
    expect(allApprovals(d, s).map((a) => a.id)).toContain("ap-new-1");
    const waiting = annualNow(d, s, jose);
    expect(waiting?.pendingHalves).toBe((before?.pendingHalves ?? 0) + 10);
    expect(waiting?.availableDays).toBe((before?.availableDays ?? 0) - 5);
    s = reduce({ ...s, role: "manager" }, { type: "role", role: "manager" });
    expect(pendingApprovals(d, s)[0]?.id).toBe("ap-new-1");
    s = reduce(s, { type: "decide", id: "ap-new-1", verdict: "approve" });
    const row = requestRows(d, s).find((r) => r.id === "lr-new-1");
    expect(row?.state).toBe("booked");
    expect(row?.decidedOn).toBe(P.asOf);
    expect(annualNow(d, s, jose)?.takenHalves)
      .toBe((before?.takenHalves ?? 0) + 10);
    s = reduce(s, { type: "undecide", id: "ap-new-1" });
    expect(requestRows(d, s).find((r) => r.id === "lr-new-1")?.state)
      .toBe("waiting");
    s = reduce(s, { type: "withdraw-leave", id: "lr-new-1" });
    expect(allApprovals(d, s).map((a) => a.id)).not.toContain("ap-new-1");
    expect(annualNow(d, s, jose)?.availableDays).toBe(before?.availableDays);
  });

  it("package-pending-requests-follow-the-decision", () => {
    const s = reduce(as("manager"), { type: "decide", id: "ap-002",
      verdict: "decline" });
    const r = requestRows(d, s).find((x) => x.approvalId === "ap-002");
    expect(r?.state).toBe("declined");
    expect(annualNow(d, s, "emp-018")?.pendingHalves).toBe(0);
  });

  it("draft-defaults-and-problems", () => {
    expect(nextWeek("2026-10-27")).toEqual({ start: "2026-11-02",
      end: "2026-11-06" });
    expect(nextWeek("2026-11-02").start).toBe("2026-11-09");
    const bal = annualNow(d, INITIAL, P.personas().employeeId);
    const c = (a: string, b: string) => P.countDays(a, b);
    expect(problemOf("lt-annual", "2026-11-06", "2026-11-02",
      c("2026-11-06", "2026-11-02"), bal)).toBe("errEnd");
    expect(problemOf("lt-annual", "2026-11-07", "2026-11-08",
      c("2026-11-07", "2026-11-08"), bal)).toBe("errNone");
    expect(problemOf("lt-annual", "2026-11-02", "2026-12-31",
      c("2026-11-02", "2026-12-31"), bal)).toBe("errOver");
    expect(problemOf("lt-unpaid", "2026-11-02", "2026-12-31",
      c("2026-11-02", "2026-12-31"), bal)).toBeNull();
    expect(problemOf("lt-annual", "2026-11-02", "2026-11-06",
      c("2026-11-02", "2026-11-06"), bal)).toBeNull();
  });

  it("half-days-read-plainly", () => {
    expect(halvesText(45, "en")).toBe("22½");
    expect(halvesText(1, "en")).toBe("½");
    expect(halvesText(10, "en")).toBe("5");
  });

  it("copy-never-claims", () => {
    const banned = /\b(compliant|approved|certified|guaranteed)\b/i;
    const keys = Object.entries(flatten(en)).filter(([k]) =>
      k.startsWith("people.") || k.startsWith("timeoff."));
    const text = (v: unknown): string[] => typeof v === "string" ? [v]
      : Object.values(v as Record<string, string>);
    expect(keys.filter(([, v]) => text(v).some((x) => banned.test(x))))
      .toEqual([]);
    const shown = [...P.leaveTypes().map((x) => x.name.en),
      ...P.reasons().map((x) => x.text.en), P.leaveApprovalTitle.en];
    expect(shown.filter((x) => banned.test(x))).toEqual([]);
  });
});
