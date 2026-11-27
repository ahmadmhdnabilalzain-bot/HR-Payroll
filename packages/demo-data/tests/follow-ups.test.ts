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
    expect(b.basis).toMatch(/^As we read it/);
  });

  it("(a) everyone else's balance in days is the halves / 2", () => {
    for (const b of c.leaveBalances) {
      if (b.availableHalves === null) continue;
      expect(b.availableDays).toBe(b.availableHalves / 2);
      expect(b.basis).toBeNull();
    }
  });

  it("(b) the 50% limit is presented as official (Art 25)", () => {
    const e = employeesWithCase(c, "loan-over-cap")[0]!;
    const s = payslipByEmployee(c, e.id)!;
    const lines = explainPayslip(c, s.id);
    const cap = lines.filter((l) => l.rules.some((r) =>
      r.key === "deductionOverallCapBps"));
    expect(cap.length).toBeGreaterThan(0);
    for (const l of cap) {
      const r = l.rules.find((x) => x.key === "deductionOverallCapBps")!;
      expect(r.status).toBe("official");
      expect(r.presentedStatus).toBe("official");
      expect(r.presentedLabel).toBeNull();
      expect(l.text.en).not.toContain("secondary-sourced");
    }
  });

  it("(b) other rules keep the engine's own status", () => {
    const s = c.payRun.payslips[0]!;
    for (const l of explainPayslip(c, s.id)) {
      for (const r of l.rules) {
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
