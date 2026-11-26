import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  letters,
  serializeDemo,
  staffRequests,
  visaCases,
  warnings,
} from "../src/index";

const c = buildDemoCompany();
const ISO = /\d{4}-\d{2}-\d{2}/;
const ids = new Set(c.employees.map((e) => e.id));

describe("WP4 letters", () => {
  it("salary certificates state the contract salary, summed", () => {
    const l = letters(c);
    expect(l.length).toBeGreaterThanOrEqual(4);
    const cert = l.find((x) => x.kind === "salary-certificate" &&
      x.status === "issued")!;
    const e = c.employees.find((x) => x.id === cert.employeeId)!;
    const total = e.basicMonthly + e.allowances.reduce((n, a) =>
      n + a.monthly, 0n);
    expect(cert.monthlySalary).toBe(total);
    expect(cert.display.salary).toMatch(/^AED /);
    for (const x of l) {
      expect(ids.has(x.employeeId)).toBe(true);
      expect(x.reference.fake).toBe(true);
      expect(x.display.requested).not.toMatch(ISO);
    }
    expect(l.some((x) => x.status === "pending")).toBe(true);
  });
});

describe("WP4 staff requests", () => {
  it("an HR queue with open items and links", () => {
    const r = staffRequests(c);
    expect(r.length).toBeGreaterThanOrEqual(5);
    expect(r.some((x) => x.status === "open")).toBe(true);
    const bank = r.find((x) => x.kind === "bank-details")!;
    expect(c.employees.find((e) => e.id === bank.employeeId)!.iban)
      .toBeNull();
    expect(bank.linksTo).toBe("enter-iban");
    for (const x of r) {
      expect(ids.has(x.employeeId)).toBe(true);
      expect(x.display.raised).not.toMatch(ISO);
      expect(x.title).toMatch(/^[A-Z]/);
    }
  });
});

describe("WP4 visa cases", () => {
  it("follow the documents near expiry and the new hire", () => {
    const v = visaCases(c);
    const visa = c.documents.find((d) => d.kind === "residence-visa" &&
      d.daysLeft <= 30)!;
    const renew = v.find((x) => x.employeeId === visa.employeeId)!;
    expect(renew.status).toBe("in-progress");
    expect(renew.display.expires).toBe("8 November");
    const eid = c.documents.find((d) => d.kind === "emirates-id" &&
      d.daysLeft <= 30)!;
    expect(v.find((x) => x.employeeId === eid.employeeId)!.status)
      .toBe("to-start");
    for (const x of v) {
      for (const s of x.stages) expect(s.display).not.toMatch(ISO);
      expect(x.feesNote).toMatch(/not shown/);
    }
  });
});

describe("WP4 warnings", () => {
  it("the late-arrival warning cites the attendance days", () => {
    const w = warnings(c);
    const late = w.find((x) => x.reasonKind === "late-arrival")!;
    const days = c.attendance.filter((d) => d.employeeId ===
      late.employeeId && d.clockIn !== null &&
      Number(d.clockIn.slice(11, 13)) * 60 +
        Number(d.clockIn.slice(14, 16)) > 8 * 60 + 15);
    expect(late.evidence.map((x) => x.iso)).toEqual(days.map((d) =>
      d.date));
    expect(late.status).toBe("draft");
    expect(late.deductionNote).toMatch(/not computed/);
    for (const x of w) {
      for (const e of x.evidence) expect(e.display).not.toMatch(ISO);
    }
  });

  it("is deterministic", () => {
    const d = buildDemoCompany();
    expect(serializeDemo([letters(d), staffRequests(d), visaCases(d),
      warnings(d)])).toBe(serializeDemo([letters(c), staffRequests(c),
      visaCases(c), warnings(c)]));
  });
});
