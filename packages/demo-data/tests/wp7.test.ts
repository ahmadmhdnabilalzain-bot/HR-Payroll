import { calculatePayslip, DEFAULT_PAYROLL_PACKS } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  appendAuditEvents,
  AS_OF,
  AUDIT_CHAIN_NOTE,
  auditEvents,
  auditRows,
  BACK_PAY_RAISE,
  buildDemoCompany,
  employeeById,
  isWorkingDay,
  NIGHT_OVERTIME,
  OVERTIME,
  payrollHistory,
  reportDate,
  serializeDemo,
  sha256Hex,
  trendRows,
  varianceBetween,
  verifyAuditChain,
  HISTORY_OVERTIME,
  HISTORY_SICK,
  pastPayslipInput,
  payslipWithoutPension,
  type DemoCompany,
} from "../src/index";

const SEEDS = [1, 2026, 7777];
const built = new Map<number, DemoCompany>(SEEDS.map((s) =>
  [s, buildDemoCompany(s)]));
const c = built.get(2026)!;
const each = (fn: (c: DemoCompany) => void) => {
  for (const s of SEEDS) fn(built.get(s)!);
};

describe("hash chain", () => {
  it("sha256 matches the known test vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e" +
      "4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b003" +
      "61a396177a9cb410ff61f20015ad");
  });

  it("each event links to the one before and the chain verifies", () => {
    each((x) => {
      const ev = auditEvents(x);
      expect(ev.length).toBeGreaterThan(30);
      expect(ev[0]!.prevHash).toBe("0".repeat(64));
      ev.forEach((e, i) => {
        if (i > 0) expect(e.prevHash).toBe(ev[i - 1]!.hash);
        expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
        expect(e.seq).toBe(i + 1);
      });
      expect(verifyAuditChain(ev)).toEqual({ ok: true, brokenAt: null,
        checked: ev.length });
    });
  });

  it("an edited or removed event is caught at the right place", () => {
    const ev = auditEvents(c).map((e) => ({ ...e }));
    const edited = ev.map((e) => ({ ...e }));
    edited[10]!.summary = "Something else";
    expect(verifyAuditChain(edited).brokenAt).toBe(11);
    const removed = ev.filter((_, i) => i !== 5);
    const r = verifyAuditChain(removed);
    expect(r.ok).toBe(false);
    expect(r.brokenAt).toBe(6);
  });

  it("entries made in the demo chain on at the end", () => {
    const ev = auditEvents(c);
    const more = appendAuditEvents(ev, [{ at: "2026-10-27T10:00",
      actorId: "emp-030", action: "access.api-key-revoked",
      area: "access", subject: { kind: "api-key", id: "k1",
        label: "Key" }, summary: "Key revoked." }]);
    expect(more).toHaveLength(ev.length + 1);
    expect(more.slice(0, ev.length)).toEqual(ev);
    expect(more.at(-1)!.prevHash).toBe(ev.at(-1)!.hash);
    expect(verifyAuditChain(more)).toEqual({ ok: true, brokenAt: null,
      checked: ev.length + 1 });
  });

  it("says what the demo chain is and is not", () => {
    expect(AUDIT_CHAIN_NOTE).toMatch(/not .*(certif|proof|legal)/i);
  });
});

describe("audit events agree with the existing data", () => {
  it("are in time order, up to the demo date, by known people", () => {
    each((x) => {
      const ev = auditEvents(x);
      ev.forEach((e, i) => {
        if (i > 0) expect(e.at >= ev[i - 1]!.at).toBe(true);
        expect(e.at.slice(0, 10) <= AS_OF).toBe(true);
        expect(e.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+04:00$/);
        if (e.actorId !== null) employeeById(x, e.actorId);
      });
    });
  });

  it("people events use the dates already in the roster", () => {
    const hire = c.employees.find((e) => e.cases.includes("probation"))!;
    const ev = auditEvents(c).find((e) => e.action === "employee.created"
      && e.subject.id === hire.id)!;
    expect(ev.at.slice(0, 10) <= hire.joiningDate).toBe(true);
    expect(ev.summary).toContain(reportDate(hire.joiningDate));
    const leaver = c.employees.find((e) => e.cases.includes("leaver"))!;
    const off = auditEvents(c).find((e) => e.action ===
      "employee.resignation-recorded" && e.subject.id === leaver.id)!;
    expect(off.summary).toContain(reportDate(leaver.leavingDate!));
    const settle = auditEvents(c).find((e) => e.action ===
      "settlement.prepared")!;
    expect(settle.subject.id).toBe(leaver.id);
    expect(settle.at.slice(0, 10) >= leaver.leavingDate!).toBe(true);
  });

  it("leave decisions match each request's status", () => {
    const ev = auditEvents(c);
    for (const r of c.leaveRequests) {
      const e = ev.filter((x) => x.subject.id === r.id);
      const decided = e.filter((x) => x.action === "leave.signed-off" ||
        x.action === "leave.declined");
      if (r.status === "pending") {
        expect(decided).toEqual([]);
        expect(e.some((x) => x.action === "leave.requested")).toBe(true);
      } else {
        expect(decided).toHaveLength(1);
        expect(decided[0]!.action).toBe(r.status === "approved"
          ? "leave.signed-off" : "leave.declined");
        // Nobody decides their own request.
        expect(decided[0]!.actorId).not.toBe(r.employeeId);
      }
    }
  });

  it("the October run events carry the run's own figures", () => {
    const ev = auditEvents(c);
    const sub = ev.find((e) => e.action === "payrun.submitted" &&
      e.subject.id === c.payRun.id)!;
    const ap = c.approvals.find((a) => a.kind === "pay-run")!;
    expect(sub.actorId).toBe(ap.makerEmployeeId);
    expect(sub.summary).toContain(employeeById(c,
      ap.checkerEmployeeId).fullName);
    expect(ev.some((e) => e.action === "payrun.signed-off" &&
      e.subject.id === c.payRun.id)).toBe(false);
    const sif = ev.find((e) => e.action === "wps.file-created")!;
    expect(sif.summary).toContain(c.sif.fileName);
    expect(sif.summary).toContain(String(c.sif.recordCount));
  });

  it("earlier runs were signed off by the GM, never by their maker", () => {
    const ev = auditEvents(c).filter((e) => e.action === "payrun.signed-off");
    expect(ev).toHaveLength(9);
    for (const e of ev) {
      expect(e.actorId).toBe("emp-001");
      expect(isWorkingDay(e.at.slice(0, 10))).toBe(true);
    }
    const prep = auditEvents(c).filter((e) =>
      e.action === "payrun.submitted" && e.at < "2026-10");
    for (const e of prep) expect(e.actorId).toBe("emp-028");
  });

  it("the late raise is in the log and matches the back pay", () => {
    const e = auditEvents(c).find((x) => x.action === "salary.revised")!;
    const bp = c.payRun.backPay[0]!;
    expect(e.subject.id).toBe(bp.employeeId);
    expect(e.summary).toContain("1,000.00");
    expect(BACK_PAY_RAISE).toBe(100000n);
    expect(e.summary).toContain(reportDate("2026-09-01"));
    expect(e.at.slice(0, 10) > "2026-09-01").toBe(true);
  });

  it("rows show who, what and when as text, never a raw ISO", () => {
    const rows = auditRows(c);
    expect(rows).toHaveLength(auditEvents(c).length);
    for (const r of rows) {
      expect(r.when).toMatch(/^\d{1,2} [A-Z][a-z]{2} 2026, \d{2}:\d{2}$/);
      expect(r.shortHash).toMatch(/^[0-9a-f]{8}\.\.\.[0-9a-f]{4}$/);
      expect(r.who.length).toBeGreaterThan(0);
    }
    expect(auditRows(c, { area: "pay" }).every((r) => r.area === "pay"))
      .toBe(true);
    expect(auditRows(c, { actorId: "emp-001" }).length).toBeGreaterThan(5);
    expect(auditRows(c)[0]!.when).toBe("12 Jan 2026, 10:02");
  });

  it("same seed, same bytes", () => {
    expect(serializeDemo(auditEvents(buildDemoCompany(2026))))
      .toBe(serializeDemo(auditEvents(buildDemoCompany(2026))));
  });
});

describe("monthly history", () => {
  it("covers January to October with October from the run itself", () => {
    each((x) => {
      const h = payrollHistory(x);
      expect(h.map((m) => m.month)).toEqual(["2026-01", "2026-02",
        "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
        "2026-09", "2026-10"]);
      const oct = h.at(-1)!;
      const t = x.payRun.totals;
      expect(oct.status).toBe("awaiting-approval");
      expect(oct.gross).toBe(t.gross);
      expect(oct.net).toBe(t.net);
      expect(oct.deductions).toBe(t.deductions);
      expect(oct.headcount).toBe(t.payslips);
      expect(h.slice(0, 9).every((m) => m.status === "paid")).toBe(true);
    });
  });

  it("each row is the sum of its lines, which come from the engine", () => {
    each((x) => {
      for (const m of payrollHistory(x)) {
        const s = (f: (l: typeof m.lines[number]) => bigint) =>
          m.lines.reduce((n, l) => n + f(l), 0n);
        expect(s((l) => l.gross)).toBe(m.gross);
        expect(s((l) => l.net)).toBe(m.net);
        expect(m.lines).toHaveLength(m.headcount);
        for (const l of m.lines) employeeById(x, l.employeeId);
      }
    });
  });

  it("matches a fresh engine run for months without overtime", () => {
    each((x) => {
      const h = payrollHistory(x);
      for (const month of [1, 4]) {
        const m = h[month - 1]!;
        // The month as paid (pastPayslipInput), run afresh.
        const fresh = x.employees.filter((e) =>
          e.joiningDate <= `2026-${String(month).padStart(2, "0")}-01`)
          .map((e) => {
            const input = pastPayslipInput(e, month);
            return (e.workerClass === "uae-national"
              ? payslipWithoutPension(input)
              : calculatePayslip(input, DEFAULT_PAYROLL_PACKS)).value;
          });
        expect(m.gross).toBe(fresh.reduce((n, p) => n + p.gross, 0n));
        expect(m.net).toBe(fresh.reduce((n, p) => n + p.net, 0n));
      }
    });
  });

  it("headcount follows the roster dates: 30, then 31 with the hire", () => {
    each((x) => {
      const h = payrollHistory(x);
      for (const m of h.slice(0, 9)) expect(m.headcount).toBe(30);
      expect(h[9]!.headcount).toBe(31);
      const hire = x.employees.find((e) => e.cases.includes("probation"))!;
      expect(h.slice(0, 9).some((m) => m.lines.some((l) =>
        l.employeeId === hire.id))).toBe(false);
      expect(h[9]!.lines.some((l) => l.employeeId === hire.id)).toBe(true);
    });
  });

  it("the back-pay raise starts in September: lower basic before", () => {
    each((x) => {
      const bp = x.payRun.backPay[0]!;
      const h = payrollHistory(x);
      const sep = h[8]!.lines.find((l) => l.employeeId === bp.employeeId)!;
      expect(sep.gross).toBe(bp.paidGross);
    });
  });

  it("overtime minutes: Oct equals the timesheets and the inputs", () => {
    each((x) => {
      const oct = payrollHistory(x).at(-1)!;
      const fromSheets = x.timesheets.reduce((n, t) =>
        n + t.overtimeMinutes, 0);
      const fromInputs = [...OVERTIME, ...NIGHT_OVERTIME]
        .reduce((n, o) => n + o.minutes, 0);
      expect(oct.overtimeMinutes).toBe(fromSheets);
      expect(oct.overtimeMinutes).toBe(fromInputs);
      const ot = x.payRun.payslips.flatMap((s) => s.payslip.earnings)
        .filter((l) => l.kind === "overtime")
        .reduce((n, l) => n + l.amount, 0n);
      expect(oct.overtimeAmount).toBe(ot);
    });
  });

  it("earlier overtime is planned, on working days, within 2 hours", () => {
    const all = Object.values(HISTORY_OVERTIME).flat();
    expect(all.length).toBeGreaterThan(2);
    for (const o of all) {
      expect(isWorkingDay(o.date)).toBe(true);
      expect(o.minutes).toBeLessThanOrEqual(120);
      expect(o.date < "2026-10-01").toBe(true);
    }
    const h = payrollHistory(c);
    const total = h.slice(0, 9).reduce((n, m) => n + m.overtimeMinutes, 0);
    expect(total).toBe(all.reduce((n, o) => n + o.minutes, 0));
    expect(h[2]!.overtimeAmount > 0n).toBe(true);
    expect(h[0]!.overtimeAmount).toBe(0n);
  });

  it("leave taken: April is the leaver's week, October the requests", () => {
    each((x) => {
      const h = payrollHistory(x);
      const apr = h[3]!.leaveTaken;
      const lr = x.leaveRequests.find((r) => r.leaveTypeId ===
        "lt-annual" && r.status === "approved")!;
      expect(lr.startDate.startsWith("2026-04")).toBe(true);
      expect(apr.annual).toBe(lr.halves / 2);
      expect(h.reduce((n, m) => n + m.leaveTaken.annual, 0))
        .toBe(lr.halves / 2);
      const oct = h[9]!.leaveTaken;
      expect(oct.unpaid).toBe(x.timesheets.reduce((n, t) =>
        n + t.unpaidDays, 0));
      expect(oct.annual + oct.sick).toBe(x.timesheets.reduce((n, t) =>
        n + t.leaveDays, 0));
    });
  });

  it("earlier sick days are on working days; unpaid only in probation", () => {
    for (const [id, from, to] of HISTORY_SICK) {
      employeeById(c, id);
      expect(isWorkingDay(from) && isWorkingDay(to)).toBe(true);
      expect(to < "2026-10-01").toBe(true);
      expect(c.leaveRequests.some((r) => r.employeeId === id &&
        r.status === "approved" && r.startDate <= to &&
        from <= r.endDate)).toBe(false);
    }
    each((x) => {
      const h = payrollHistory(x);
      expect(h[1]!.leaveTaken.sick).toBe(2);
      for (const [id, from, to] of HISTORY_SICK) {
        const e = employeeById(x, id);
        const month = Number(from.slice(5, 7));
        const line = h[month - 1]!.lines.find((l) => l.employeeId === id)!;
        // The same month as paid, without the sick days.
        const input = pastPayslipInput(e, month);
        const well = { ...input, absences: input.absences.filter((a) =>
          a.kind !== "sick") };
        const fresh = (e.workerClass === "uae-national"
          ? payslipWithoutPension(well)
          : calculatePayslip(well, DEFAULT_PAYROLL_PACKS)).value.gross;
        const probation = e.probationEndDate !== null &&
          e.probationEndDate >= from;
        if (probation) expect(line.gross < fresh).toBe(true);
        else expect(line.gross).toBe(fresh);
        expect(to.slice(0, 7)).toBe(from.slice(0, 7));
      }
    });
  });

  it("trend rows have display strings and a change against last month", () => {
    const rows = trendRows(c);
    expect(rows).toHaveLength(10);
    expect(rows[0]!.monthText).toBe("Jan 2026");
    expect(rows[0]!.changeText).toBe("First month shown");
    expect(rows[9]!.statusText).toBe("Awaiting sign-off");
    expect(rows[8]!.statusText).toBe("Paid");
    expect(rows[9]!.grossText).toMatch(/^AED [\d,]+\.\d{2}$/);
    expect(rows[9]!.changeText).toMatch(/^[+-]AED [\d,]+\.\d{2} \(/);
    expect(rows[1]!.headcountText).toBe("30 people");
  });
});

describe("variance, October against September", () => {
  it("drivers add up to the gross difference exactly", () => {
    each((x) => {
      const v = varianceBetween(x, "2026-10", "2026-09");
      const sum = v.drivers.reduce((n, d) => n + d.amount, 0n);
      expect(sum).toBe(v.grossChange);
      const h = payrollHistory(x);
      expect(v.grossChange).toBe(h[9]!.gross - h[8]!.gross);
      expect(v.netChange).toBe(h[9]!.net - h[8]!.net);
      expect(v.drivers.some((d) => d.key === "other")).toBe(false);
    });
  });

  it("names each demo case as the reason, with who and how much", () => {
    const v = varianceBetween(c, "2026-10", "2026-09");
    const keys = v.drivers.map((d) => d.key).sort();
    expect(keys).toEqual(["back-pay", "leaver", "new-joiner", "overtime",
      "salary-raise", "unpaid-leave"].sort());
    const raise = v.drivers.find((d) => d.key === "salary-raise")!;
    expect(raise.amount).toBe(BACK_PAY_RAISE);
    expect(raise.people).toEqual(c.payRun.backPay.map((b) =>
      b.employeeId));
    const bp = v.drivers.find((d) => d.key === "back-pay")!;
    expect(bp.amount).toBe(c.payRun.backPay[0]!.amount);
    expect(bp.people).toEqual([c.payRun.backPay[0]!.employeeId]);
    expect(v.drivers.find((d) => d.key === "new-joiner")!.amount > 0n)
      .toBe(true);
    expect(v.drivers.find((d) => d.key === "leaver")!.amount < 0n)
      .toBe(true);
    expect(v.drivers.find((d) => d.key === "unpaid-leave")!.amount < 0n)
      .toBe(true);
    for (const d of v.drivers) expect(d.text).toMatch(/AED/);
    expect(v.headcountChange).toBe(1);
    expect(v.title).toBe("Oct 2026 against Sep 2026");
  });

  it("works for any two months and refuses an unknown one", () => {
    const v = varianceBetween(c, "2026-03", "2026-02");
    const keys = v.drivers.map((d) => d.key);
    expect(keys).toContain("overtime");
    expect(keys.every((k) => k === "overtime" || k === "sick-leave"))
      .toBe(true);
    expect(v.drivers.reduce((n, d) => n + d.amount, 0n))
      .toBe(v.grossChange);
    expect(() => varianceBetween(c, "2025-12", "2026-01"))
      .toThrow(/no history/i);
  });
});
