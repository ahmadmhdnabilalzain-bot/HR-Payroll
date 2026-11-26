import { calculatePayslip, DEFAULT_PAYROLL_PACKS, fils } from
  "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  analyse,
  analysisDatasets,
  buildDemoCompany,
  compareParallel,
  contractCheck,
  customFields,
  CUSTOM_FIELD_LIMITS,
  elementReport,
  parallelCauses,
  parallelSamples,
  pastRuns,
  payrollHistory,
  payrollJournal,
  signOffReport,
  VARIANCE_LIMIT_TEXT,
  whatIf,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;

describe("WPE pay elements (X06)", () => {
  it("earnings add up to gross in both months", () => each((c) => {
    const r = elementReport(c);
    const sept = pastRuns(c).find((x) => x.month === 9)!;
    expect(r.earningsOctober).toBe(c.payRun.totals.gross);
    expect(r.earningsSeptember).toBe(sept.totals.gross);
    const earn = r.rows.filter((x) => x.type === "earning");
    expect(earn.reduce((n, x) => n + x.october, 0n))
      .toBe(c.payRun.totals.gross);
    const ded = r.rows.filter((x) => x.type === "deduction");
    expect(ded.reduce((n, x) => n + x.october, 0n))
      .toBe(c.payRun.totals.deductions);
  }));
});

describe("WPE payroll journal (X08)", () => {
  it("debits equal credits equal gross, to the fils", () => each((c) => {
    const j = payrollJournal(c);
    expect(j.balanced).toBe(true);
    expect(j.debits).toBe(c.payRun.totals.gross);
    expect(j.credits).toBe(c.payRun.totals.gross);
    expect(j.note).toMatch(/not an accounting entry/);
  }));
  it("held pay is its own credit line", () => {
    const c = buildDemoCompany();
    const held = payrollJournal(c).lines.find((l) =>
      l.account.includes("held"));
    expect(held?.amount).toBe(c.payRun.totals.heldNet);
  });
});

describe("WPE analysis builder (X30)", () => {
  it("each dataset's total is its source's", () => each((c) => {
    const [pay, head, leave, ot] = analysisDatasets(c);
    const h = payrollHistory(c);
    expect(analyse(pay!, "month", "gross").total)
      .toBe(h.reduce((n, m) => n + m.gross, 0n));
    expect(analyse(pay!, "department", "net").total)
      .toBe(h.reduce((n, m) => n + m.net, 0n));
    expect(analyse(head!, "branch", "people").total)
      .toBe(BigInt(c.payRun.payslips.length));
    expect(analyse(leave!, "type", "requests").total)
      .toBe(BigInt(c.leaveRequests.length));
    expect(analyse(ot!, "month", "amount").total)
      .toBe(h.reduce((n, m) => n + m.overtimeAmount, 0n));
    expect(analyse(ot!, "month", "minutes").total)
      .toBe(BigInt(h.reduce((n, m) => n + m.overtimeMinutes, 0)));
  }));
  it("months come in calendar order", () => {
    const c = buildDemoCompany();
    const r = analyse(analysisDatasets(c)[0]!, "month", "gross");
    expect(r.rows[0]!.label).toBe("Jan 2026");
    expect(r.rows.at(-1)!.label).toBe("Oct 2026");
  });
});

describe("WPE sign-off report (X32)", () => {
  it("lists every inbox item as waiting and every decision", () =>
    each((c) => {
      const r = signOffReport(c);
      expect(r.filter((x) => x.outcome === "waiting").map((x) =>
        x.inboxId).sort()).toEqual(c.approvals.map((a) => a.id).sort());
      expect(r.some((x) => x.outcome === "signed-off")).toBe(true);
      for (const x of r.filter((y) => y.outcome === "waiting")) {
        const a = c.approvals.find((y) => y.id === x.inboxId)!;
        expect(a.makerEmployeeId).not.toBe(a.checkerEmployeeId);
      }
    }));
});

describe("WPE what-if (R09)", () => {
  it("no change gives the run exactly", () => each((c) => {
    for (const s of c.payRun.payslips.slice(0, 6)) {
      const w = whatIf(c, { employeeId: s.employeeId });
      expect(w.after).toEqual(w.before);
      expect(w.run.after.net).toBe(c.payRun.totals.net);
      expect(w.run.after.gross).toBe(c.payRun.totals.gross);
      expect(w.run.before.inFile).toBe(fils(c.payRun.totals.net -
        c.payRun.totals.heldNet));
    }
  }));
  it("a new basic is the engine's own answer", () => {
    const c = buildDemoCompany();
    const s = c.payRun.payslips.find((x) => x.basis ===
      "calculatePayslip")!;
    const basic = fils(s.input.employee.basicMonthly + 50000n);
    const w = whatIf(c, { employeeId: s.employeeId, basic });
    const direct = calculatePayslip({ ...s.input, employee: {
      ...s.input.employee, basicMonthly: basic } },
    DEFAULT_PAYROLL_PACKS).value;
    expect(w.after.net).toBe(direct.net);
    expect(w.run.after.net - w.run.before.net)
      .toBe(direct.net - s.payslip.net);
  });
  it("added overtime raises gross", () => {
    const c = buildDemoCompany();
    const id = c.payRun.payslips[3]!.employeeId;
    const w = whatIf(c, { employeeId: id, extraOvertimeMinutes: 300 });
    expect(w.after.gross > w.before.gross).toBe(true);
    expect(w.asked.join(" ")).toMatch(/5 hours more overtime/);
  });
});

describe("WPE parallel run (S38)", () => {
  it("the first export differs only where a cause explains it", () =>
    each((c) => {
      const [first, cleaned] = parallelSamples(c);
      const a = compareParallel(c, first!.text);
      expect(a.differs).toBeGreaterThan(2);
      expect(a.explained).toBe(a.differs);
      expect(a.matches + a.differs).toBe(a.rows.length);
      const b = compareParallel(c, cleaned!.text);
      expect(b.differs).toBeLessThan(a.differs);
      expect(b.rows.filter((r) => r.status === "differs")
        .every((r) => r.causes.every((k) => k.kind === "rule"))).toBe(true);
    }));
  it("a cause is an engine difference, never zero", () => each((c) => {
    for (const s of c.payRun.payslips) {
      for (const k of parallelCauses(c, s.employeeId)) {
        expect(k.difference).not.toBe(0n);
      }
    }
  }));
  it("an unknown difference is said plainly", () => {
    const c = buildDemoCompany();
    const s = c.payRun.payslips[1]!;
    const e = c.employees.find((x) => x.id === s.employeeId)!;
    const r = compareParallel(c, "h\n" + `${e.number},${e.fullName},1.00\n` +
      "ZZ-9,Nobody,5.00\nX,Y,abc\n");
    expect(r.rows[0]!.status).toBe("differs");
    expect(r.rows[0]!.explained).toBe(false);
    expect(r.rows[1]!.status).toBe("not-ours");
    expect(r.rows[2]!.status).toBe("unreadable");
  });
});

describe("WPE pre-pay gate (R15)", () => {
  it("contracts match the run on the demo data", () => each((c) => {
    expect(contractCheck(c).mismatches).toEqual([]);
  }));
  it("a basic off the contract is caught", () => {
    const c = buildDemoCompany();
    const s = c.payRun.payslips[0]!;
    const bent: DemoCompany = { ...c, payRun: { ...c.payRun, payslips: [{
      ...s, input: { ...s.input, employee: { ...s.input.employee,
        basicMonthly: fils(s.input.employee.basicMonthly + 1n) } } },
    ...c.payRun.payslips.slice(1)] } };
    expect(contractCheck(bent).mismatches).toHaveLength(1);
  });
});

describe("WPE words", () => {
  it("no authority words and no raw dates in display text", () =>
    each((c) => {
      const shown = asText([elementReport(c), payrollJournal(c).lines,
        payrollJournal(c).note,
        signOffReport(c).map((r) => [r.kindText, r.subject, r.askedOn,
          r.decidedOn, r.outcomeText, r.tookText]),
        parallelSamples(c).map((s) => [s.label, s.note]),
        compareParallel(c, parallelSamples(c)[0]!.text).rows.map((r) =>
          [r.statusText, r.causeText]),
        customFields(), CUSTOM_FIELD_LIMITS, VARIANCE_LIMIT_TEXT,
        analysisDatasets(c).map((d) => [d.label, d.source, d.dims,
          d.measures, d.rows.map((r) => r.dims)])]);
      expect(shown).not.toMatch(BANNED_WORDS);
      expect(shown.replace(/"(id|code|iso|sortKey|employeeId)":"[^"]*"/g,
        "")).not.toMatch(ISO);
    }));
});
