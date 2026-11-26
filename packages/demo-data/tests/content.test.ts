import { ibanChecksumOk } from "@payroll/wps";
import { describe, expect, it } from "vitest";
import {
  approvalsInbox,
  buildDemoCompany,
  documents,
  headline,
  payCalendar,
  DEMO_AR_REVIEWED,
  DEMO_LABELS,
  employeesWithCase,
  explainPayslip,
  explainPayslipLine,
  isDemoLabelKey,
  issuesOf,
  leaveRequests,
  luhnOk,
  needsConfirmation,
  payslipByEmployee,
  sifSummary,
  type CaseTag,
} from "../src/index";

const c = buildDemoCompany();

describe("no real-looking identifiers", () => {
  it("IBANs are in the fictional 999 range; only the typo fails", () => {
    for (const s of [1, 2026, 7777]) {
      for (const e of buildDemoCompany(s).employees) {
        if (e.iban === null) continue;
        expect(e.iban.value).toMatch(/^AE\d{2}999\d{16}$/);
        expect(ibanChecksumOk(e.iban.value))
          .toBe(!e.cases.includes("iban-typo"));
        expect(e.iban.fake).toBe(true);
      }
    }
  });

  it("Emirates IDs fail the Luhn check and are masked", () => {
    for (const e of c.employees) {
      expect(e.emiratesId.value).toMatch(/^784\d{12}$/);
      expect(luhnOk(e.emiratesId.value)).toBe(false);
      expect(e.emiratesId.masked).not.toMatch(/\d{4,}/);
    }
    expect(luhnOk("79927398713")).toBe(true);
  });

  it("labour, employer ids and e-mails are in fake ranges", () => {
    expect(c.company.employerId).toMatch(/^99\d{11}$/);
    expect(c.company.fictional).toBe(true);
    for (const e of c.employees) {
      expect(e.labourPersonId).toMatch(/^99\d{12}$/);
      expect(e.email.endsWith("@zarqan-demo.test")).toBe(true);
    }
  });
});

describe("the demo bank", () => {
  it("has about 30 staff with the named roles", () => {
    expect(c.employees).toHaveLength(31);
    const jobs = c.employees.map((e) => e.jobKey);
    for (const j of ["general-manager", "hr-manager", "it-manager",
      "compliance-officer", "teller"]) expect(jobs).toContain(j);
    expect(jobs.filter((j) => j === "relationship-manager"))
      .toHaveLength(3);
    expect(c.nationalities.uaeNationals).toBeGreaterThanOrEqual(12);
    expect(c.company.emirate).toBe("Abu Dhabi");
  });

  it("has each special case once", () => {
    const tags: CaseTag[] = ["probation", "leaver", "unpaid-leave",
      "overtime", "night-overtime", "back-pay", "missing-iban",
      "iban-typo", "loan-over-cap"];
    for (const t of tags) expect(employeesWithCase(c, t)).toHaveLength(1);
    const [b] = c.payRun.backPay;
    expect(b!.amount).toBe(b!.owedGross - b!.paidGross);
    expect(b!.amount > 0n).toBe(true);
  });

  it("has the leave, expense, document and approval samples", () => {
    expect(c.leaveRequests.length).toBeGreaterThanOrEqual(4);
    expect(leaveRequests(c, "pending").length).toBeGreaterThan(0);
    expect(c.leaveRequests.some((r) => r.leaveTypeId === "lt-sick"))
      .toBe(true);
    expect(c.leaveRequests.some((r) => r.leaveTypeId === "lt-unpaid"))
      .toBe(true);
    expect(c.expenses).toHaveLength(2);
    const near = c.documents.filter((d) => d.daysLeft <= 30);
    expect(near.map((d) => d.kind).sort()).toEqual(["emirates-id",
      "residence-visa"]);
    const run = approvalsInbox(c).find((a) => a.kind === "pay-run")!;
    expect(run.makerEmployeeId).not.toBe(run.checkerEmployeeId);
    for (const a of approvalsInbox(c)) {
      expect(a.makerEmployeeId).not.toBe(a.checkerEmployeeId);
    }
  });

  it("Emiratisation is headcount by nationality only", () => {
    const n = c.nationalities as unknown as Record<string, unknown>;
    expect(Object.keys(n).sort()).toEqual(["asOf", "byNationality",
      "headcount", "label", "uaeNationals"]);
    expect(n.label).toBe("sample data, regime for banks to be confirmed");
  });
});

describe("problems from the engine, the SIF check and demo checks",
  () => {
  const issues = issuesOf(c);
  const codes = issues.map((i) => i.code);

  it("lists each engine flag and SIF finding, with a fix", () => {
    for (const f of c.sif.findings) expect(codes).toContain(f.code);
    for (const s of c.payRun.payslips) {
      for (const f of s.payslip.flags) {
        expect(issues.some((i) => i.employeeId === s.employeeId &&
          (i.code === f.code || i.code === "DEDUCTION_DEFERRED")))
          .toBe(true);
      }
    }
    for (const want of ["SIF_HELD_NO_IBAN", "IBAN_CHECKSUM",
      "OVERTIME_DAILY_CAP_EXCEEDED", "DEDUCTION_DEFERRED",
      "SICK_UNPAID_PROBATION", "PENSION_NOT_COMPUTED"]) {
      expect(codes).toContain(want);
    }
    for (const i of issues) {
      expect(i.suggestedFix.en.length, i.code).toBeGreaterThan(10);
      expect(i.suggestedFix.ar.length, i.code).toBeGreaterThan(3);
      expect(i.plainReason.ar.length, i.code).toBeGreaterThan(3);
    }
    const kind = (code: string) => issues.find((i) => i.code === code)!
      .fixKind;
    expect(kind("SIF_HELD_NO_IBAN")).toBe("enter-iban");
    expect(kind("IBAN_CHECKSUM")).toBe("enter-iban");
    expect(kind("DOCUMENT_EXPIRING")).toBe("renew-document");
    expect(kind("PENSION_NOT_COMPUTED")).toBe("confirm-pension");
  });

  it("engine and validator issues carry their own words", () => {
    for (const i of issues.filter((x) => x.source === "engine" ||
      x.source === "sif-validator")) {
      expect(i.raisedAs, i.code).not.toBeNull();
    }
  });

  it("the pension item is listed as needing confirmation", () => {
    expect(needsConfirmation(c).map((i) => i.code))
      .toContain("PENSION_NOT_COMPUTED");
  });

  it("no compliance, certification or approval claim anywhere", () => {
    const text = [c.sif.report, ...issues.flatMap((i) =>
      [i.plainReason.en, i.suggestedFix.en]),
    ...Object.values(DEMO_LABELS.en)].join("\n");
    expect(text).not.toMatch(/\bcompliant\b|approved by|certif/i);
  });
});

describe("selectors, explanations and labels", () => {
  it("explains any payslip line with inputs, rule ids and steps", () => {
    const e = employeesWithCase(c, "overtime")[0]!;
    const s = payslipByEmployee(c, e.id)!;
    const ot = s.payslip.earnings.find((l) => l.kind === "overtime")!;
    const x = explainPayslipLine(c, s.id, ot.traceId);
    expect(x.rules.length).toBeGreaterThan(0);
    expect(x.rules[0]!.ruleId).toMatch(/^ae-payroll@/);
    expect(x.steps[0]).toMatch(/^Formula/);
    expect(x.rulesScope).toBe("UAE mainland rules");
    for (const l of explainPayslip(c, s.id)) {
      for (const r of l.rules) expect(r.source).not.toBeNull();
    }
    expect(() => explainPayslipLine(c, s.id, "nope")).toThrow();
    const n = c.payRun.payslips.find((x) => x.pension !== null)!;
    const p = explainPayslipLine(c, n.id, n.pension!.traceId);
    expect(p.text.en).toBe(n.pension!.reason.en);
    expect(p.text.en).not.toMatch(/untranslated/);
  });

  it("headline basis, documents and the pay calendar", () => {
    const h = headline(c);
    expect(h.basis.ruleSet).toBe("UAE mainland");
    expect(Object.keys(h.basis).sort()).toEqual(["pension", "ruleSet"]);
    expect(h.basis.pension).toMatch(/^UAE nationals: not computed \(/);
    const d = documents(c);
    expect(d[0]!.daysLeft).toBeLessThanOrEqual(d[1]!.daysLeft);
    const p = payCalendar(c);
    expect(p.label).toBe("sample dates");
    expect([p.asOf, p.cutOff, p.approveBy, p.sifDue, p.payday]
      .every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))).toBe(true);
    expect(p.approveBy <= p.sifDue && p.sifDue <= p.payday).toBe(true);
  });

  it("the SIF summary counts the held payslip", () => {
    const s = sifSummary(c);
    expect(s.heldOut).toBe(1);
    expect(s.employees).toBe(c.payRun.payslips.length - 1);
  });

  it("Arabic and English labels match; Arabic is flagged", () => {
    expect(Object.keys(DEMO_LABELS.ar).sort())
      .toEqual(Object.keys(DEMO_LABELS.en).sort());
    expect(DEMO_AR_REVIEWED).toBe(false);
  });

  it("every label key used by the data exists", () => {
    const keys = [...c.departments.map((d) => d.labelKey),
      ...c.employees.flatMap((e) => [`job.${e.jobKey}`,
        `location.${e.location}`, ...e.cases.map((t) => `case.${t}`)]),
      ...c.leaveTypes.map((t) => t.labelKey),
      ...c.leaveRequests.map((r) => r.reasonKey),
      ...c.expenses.map((x) => x.titleKey),
      ...c.approvals.map((a) => a.titleKey),
      ...c.documents.map((d) => `doc.${d.kind}`)];
    for (const k of keys) expect(isDemoLabelKey(k), k).toBe(true);
  });
});
