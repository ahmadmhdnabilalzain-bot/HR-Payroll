import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  employeesWithCase,
  explainPayslip,
  issuesOf,
  payslipByEmployee,
  unusedLeaveAtExit,
  leaveDaysOf,
} from "../src/index";

const c = buildDemoCompany();

describe("follow-ups after the merge", () => {
  it("(a) the leaver's balance equals the settlement's days", () => {
    const e = employeesWithCase(c, "leaver")[0]!;
    const b = c.leaveBalances.find((x) => x.employeeId === e.id)!;
    const s = c.payRun.settlements[0]!;
    const same = leaveDaysOf(unusedLeaveAtExit(e, c.leaveRequests, 30));
    expect(b.availableDays).toBe(s.unusedLeaveDays);
    expect(b.availableDays).toBe(same);
    expect(b.availableDays).toBe(18.71);
    // No second figure to disagree with on the leave screens.
    expect(b.availableHalves).toBeNull();
    expect(b.basis).toMatch(/^our reading/);
  });

  it("(a) everyone else's balance in days is the halves / 2", () => {
    for (const b of c.leaveBalances) {
      if (b.availableHalves === null) continue;
      expect(b.availableDays).toBe(b.availableHalves / 2);
      expect(b.basis).toBeNull();
    }
  });

  it("(b) the 50% limit is presented as secondary, as we read it", () => {
    const e = employeesWithCase(c, "loan-over-cap")[0]!;
    const s = payslipByEmployee(c, e.id)!;
    const lines = explainPayslip(c, s.id);
    const cap = lines.filter((l) => l.rules.some((r) =>
      r.key === "deductionOverallCapBps"));
    expect(cap.length).toBeGreaterThan(0);
    for (const l of cap) {
      const r = l.rules.find((x) => x.key === "deductionOverallCapBps")!;
      expect(r.status).toBe("official");
      expect(r.presentedStatus).toBe("secondary");
      expect(r.presentedLabel).toBe("secondary-sourced, as we read it");
      expect(l.text.en).toContain("secondary-sourced, as we read it");
      // "official" may stay only for another rule on the same line
      // (e.g. the loan consent rule, Art 25(1)(a)).
      const others = l.rules.some((x) => x.key !==
        "deductionOverallCapBps" && x.presentedStatus === "official");
      expect(/\bofficial\b/.test(l.text.en)).toBe(others);
      expect(l.steps.join("\n"))
        .not.toMatch(/deductionOverallCapBps = \d+ \(official/);
    }
  });

  it("(b) other rules keep the engine's own status", () => {
    const s = c.payRun.payslips[0]!;
    for (const l of explainPayslip(c, s.id)) {
      for (const r of l.rules) {
        if (r.key === "deductionOverallCapBps") continue;
        expect(r.presentedStatus).toBe(r.overridden ? "overridden"
          : r.status);
      }
    }
  });

  it("the Arabic overtime fix matches the English", () => {
    const ot = issuesOf(c).find((i) =>
      i.code === "OVERTIME_DAILY_CAP_EXCEEDED")!;
    expect(ot.suggestedFix.ar).not.toMatch(/البدلاء|ساعتين/);
    expect(ot.suggestedFix.ar).toMatch(/مسجَّل/);
  });
});
