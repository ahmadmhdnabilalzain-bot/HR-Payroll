import {
  GRATUITY_PACKS,
  mulDiv,
  requireParam,
  type RoundingMode,
} from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  approvalsInbox,
  buildDemoCompany,
  DEMO_LABELS,
  employeesWithCase,
  headline,
  issuesOf,
  payCalendar,
  PENSION_NOT_COMPUTED,
  RULES_SCOPE,
  sifSummary,
  unusedLeaveAtExit,
} from "../src/index";

const c = buildDemoCompany();

describe("review rulings", () => {
  it("(1) the pension caveat sits on the net and employer figures", () => {
    const h = headline(c);
    expect(h.netNote).toBe("Net pay excludes pension for the 14 UAE " +
      "nationals; to be set up once the fund is confirmed");
    expect(h.employerCostNote).toMatch(/not computed/);
    const run = approvalsInbox(c).find((a) => a.kind === "pay-run")!;
    expect(run.amountNote).toBe(h.netNote);
    for (const s of c.payRun.payslips) {
      const national = s.pension !== null;
      expect(s.employer.status).toBe(national ? "not-computed"
        : "computed");
      const line = s.trace.find((l) => l.id === "employer.total")!;
      expect(line.result === "not computed").toBe(national);
    }
  });

  it("(2) leave at exit is pro rata through the last day", () => {
    const e = employeesWithCase(c, "leaver")[0]!;
    const s = c.payRun.settlements[0]!;
    const u = unusedLeaveAtExit(e, c.leaveRequests, 30);
    // Jan to Sep in full, 15 of 31 days of October, less 5 days taken.
    expect(u.fullMonths).toBe(9);
    expect(u.workedInLastMonth).toBe(15);
    expect(u.takenDays).toBe(5);
    expect(s.unusedLeaveDays).toBeCloseTo(18.71, 2);
    const pack = GRATUITY_PACKS[0]!;
    const want = mulDiv(e.basicMonthly, u.num, u.den *
      BigInt(Number(requireParam(pack, "leavePayDivisor").value)),
    requireParam(pack, "roundingMode").value as RoundingMode);
    expect(s.result.leavePay).toBe(want);
    expect(s.result.total).toBe(s.result.gratuity + want);
    const acc = s.trace.find((l) => l.id === "leave.accrued")!;
    expect(acc.inputs["basis"]).toBe("our reading: the law gives leave " +
      "for parts of the last year but no method");
  });

  it("(3) the loan cap is our rule, not 'the legal cap'", () => {
    const i = issuesOf(c).find((x) => x.code === "DEDUCTION_DEFERRED")!;
    expect(i.plainReason.en).toContain("Deductions are limited to 50% of " +
      "the wage in our rules (secondary-sourced; the 85% payment test " +
      "is not applied in this demo).");
    expect(i.plainReason.en).not.toMatch(/legal cap|official/i);
    expect(i.sourceStatus).toBe("secondary");
    expect(i.raisedAs ?? "").not.toMatch(/overall-cap/);
  });

  it("(4, 5) the pay calendar", () => {
    const p = payCalendar(c);
    expect(p.cutOff).toBe("2026-10-22");
    expect(p.salaryFileSent).toBe("2026-10-29");
    expect(p.settlementDue).toMatchObject({ iso: "2026-10-29",
      display: "29 October" });
    expect(p.settlementDue!.basis).toMatch(/^our reading/);
    expect(p.legalDueNote).toBe("Wages are due by the 1st of the next " +
      "month (WPS rule, secondary source; primary text not yet read)");
    expect(p.items.map((x) => x.label)).toContain("Salary file sent");
    expect(p.items.every((x) => x.date.display !== "")).toBe(true);
  });

  it("(6) the bank-file summary leads with the problem", () => {
    const s = sifSummary(c);
    expect(s.headlineText).toBe("1 problem to fix, 1 note");
    expect(s.linesNote).toBe("30 people, 61 lines: a salary line and an " +
      "allowance line for each person, plus a control line");
    expect(s.validatorReport).toMatch(/^No errors/);
  });

  it("(7) one headcount sentence", () => {
    const want = "31 on the October payroll, 30 active on 27 October " +
      "(1 left on 15 October)";
    expect(headline(c).headcountText).toBe(want);
    expect(c.nationalities.headcountText).toBe(want);
  });

  it("(8, 9, 10) wording", () => {
    expect(PENSION_NOT_COMPUTED.en).toContain("must be confirmed with " +
      "the fund");
    expect(DEMO_LABELS.en["issues.title"]).toBe("Found before approval");
    expect(RULES_SCOPE).toBe("Based on UAE mainland rules, as we read " +
      "them");
    const ot = issuesOf(c).find((x) =>
      x.code === "OVERTIME_DAILY_CAP_EXCEEDED")!;
    expect(ot.suggestedFix.en).toBe("Confirm the overtime was agreed " +
      "and recorded.");
    const b = c.payRun.backPay[0]!;
    expect(b.label).toBe("Back pay on basic salary");
    expect(b.note).toMatch(/housing allowance is unchanged/);
    expect(DEMO_LABELS.en["case.back-pay"]).toMatch(/^Back pay on basic/);
  });
});
