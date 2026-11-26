import { ibanChecksumOk } from "@payroll/wps";
import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  DEMO_LABELS,
  employeesWithCase,
  explainPayslip,
  explainPayslipLine,
  isDemoLabelKey,
  issuesOf,
  luhnOk,
  type CaseTag,
} from "../src/index";

const c = buildDemoCompany();

describe("no real-looking identifiers", () => {
  it("every IBAN is in the fake range and fails mod 97", () => {
    for (const s of [1, 2026, 7777]) {
      for (const e of buildDemoCompany(s).employees) {
        if (e.iban === null) continue;
        expect(e.iban.value).toMatch(/^AE0[01]\d{19}$/);
        expect(ibanChecksumOk(e.iban.value)).toBe(false);
        expect(e.iban.fake).toBe(true);
      }
    }
  });

  it("every Emirates ID fails the Luhn check and is masked", () => {
    for (const e of c.employees) {
      expect(e.emiratesId.value).toMatch(/^784\d{12}$/);
      expect(luhnOk(e.emiratesId.value)).toBe(false);
      expect(e.emiratesId.masked).not.toMatch(/\d{4,}/);
    }
  });

  it("labour, employer ids and emails are in fake ranges", () => {
    expect(c.company.employerId).toMatch(/^99\d{11}$/);
    for (const e of c.employees) {
      expect(e.labourPersonId).toMatch(/^99\d{12}$/);
      expect(e.email.endsWith("@demo-company.test")).toBe(true);
    }
    for (const d of c.documents) expect(d.number.fake).toBe(true);
    expect(c.fake).toBe(true);
  });

  it("luhnOk accepts a known valid number", () => {
    expect(luhnOk("79927398713")).toBe(true);
  });
});

describe("the demo company", () => {
  it("has 48 employees, 8 in each of 6 departments", () => {
    expect(c.employees).toHaveLength(48);
    expect(c.departments).toHaveLength(6);
    for (const d of c.departments) {
      expect(c.employees.filter((e) => e.departmentId === d.id))
        .toHaveLength(8);
    }
    expect(new Set(c.employees.map((e) => e.nationality)).size)
      .toBeGreaterThan(8);
    expect(c.gpssa.nationals).toBe(8);
  });

  it("has each special case exactly once", () => {
    const tags: CaseTag[] = ["probation", "leaver", "unpaid-leave",
      "overtime", "back-pay", "missing-iban", "loan"];
    for (const t of tags) expect(employeesWithCase(c, t)).toHaveLength(1);
    const [p] = employeesWithCase(c, "probation");
    expect(p!.probationEndDate).toBe("2027-01-31");
    const [b] = c.payRun.backPay;
    expect(b!.amount).toBe(b!.owedGross - b!.paidGross);
    expect(b!.amount > 0n).toBe(true);
  });

  it("has pending leave, approvals, documents and goals", () => {
    expect(c.leaveRequests.some((r) => r.status === "pending")).toBe(true);
    expect(c.leaveBalances.length).toBeGreaterThan(40);
    expect(c.approvals.length).toBeGreaterThan(4);
    expect(c.documents.some((d) => d.state === "expired")).toBe(true);
    expect(c.goals.length).toBeGreaterThan(6);
    expect(c.attendance.length).toBeGreaterThan(900);
    expect(c.timesheets).toHaveLength(c.payRun.payslips.length);
  });

  it("the unpaid and overtime cases reach the payslip", () => {
    const [u] = employeesWithCase(c, "unpaid-leave");
    const slip = c.payRun.payslips.find((s) => s.employeeId === u!.id)!;
    expect(slip.payslip.unpaidDays).toBe(3);
    const [o] = employeesWithCase(c, "overtime");
    const ot = c.payRun.payslips.find((s) => s.employeeId === o!.id)!;
    expect(ot.payslip.earnings.some((e) => e.kind === "overtime"))
      .toBe(true);
  });
});

describe("issues, explanations and labels", () => {
  it("lists the missing IBAN and SIF findings with reasons", () => {
    const issues = issuesOf(c);
    expect(issues.map((i) => i.code)).toContain("MISSING_IBAN");
    expect(issues.map((i) => i.code)).toContain("SIF_IBAN_CHECKSUM");
    for (const i of issues) {
      expect(i.reason.en.length).toBeGreaterThan(10);
      expect(i.reason.ar.length).toBeGreaterThan(3);
    }
  });

  it("the SIF report and issues never say compliant", () => {
    expect(c.sif.report).not.toMatch(/complian/i);
    for (const i of issuesOf(c)) expect(i.reason.en).not.toMatch(
      /complian/i);
  });

  it("explains a payslip line with its sources", () => {
    const s = c.payRun.payslips[0]!;
    const basic = s.payslip.earnings.find((e) => e.kind === "basic")!;
    const x = explainPayslipLine(c, s.id, basic.traceId);
    expect(x.text.en).toMatch(/AED/);
    expect(x.text.ar.length).toBeGreaterThan(0);
    for (const line of explainPayslip(c, s.id)) {
      for (const r of line.rules) expect(r.source).not.toBeNull();
    }
    expect(() => explainPayslipLine(c, s.id, "nope")).toThrow();
  });

  it("Arabic and English labels have the same keys", () => {
    expect(Object.keys(DEMO_LABELS.ar).sort())
      .toEqual(Object.keys(DEMO_LABELS.en).sort());
  });

  it("every label key used by the data exists", () => {
    const keys = [...c.departments.map((d) => d.labelKey),
      ...c.employees.map((e) => `job.${e.jobKey}`),
      ...c.leaveTypes.map((t) => t.labelKey),
      ...c.leaveRequests.map((r) => r.reasonKey),
      ...c.approvals.map((a) => a.titleKey),
      ...c.goals.map((g) => g.titleKey),
      ...c.documents.map((d) => `doc.${d.kind}`)];
    for (const k of keys) expect(isDemoLabelKey(k), k).toBe(true);
  });
});
