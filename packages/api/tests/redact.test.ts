import { EmployeeView, type Role } from "@payroll/contract";
import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import type { EmployeeRow } from "../src/people/employees";
import { inScope, toEmployeeView, viewerScope } from "../src/people/redact";

const SELF = "00000000-0000-4000-8000-00000000e001";
const REPORT = "00000000-0000-4000-8000-00000000e002";
const OTHER = "00000000-0000-4000-8000-00000000e003";

function row(id: string, managerId: string | null): EmployeeRow {
  return {
    id, companyId: "00000000-0000-4000-8000-00000000000a",
    number: id.slice(-3), fullName: "P", fullNameAr: null, email: null,
    departmentId: null, managerId, jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate: "2020-01-01",
    lastWorkingDate: null, labourPersonId: "00000000000001",
    emiratesIdNumber: "784199012345671",
    salary: [{ code: "basic", label: "Basic", labelAr: null,
      amount: fils(777777n), sifBucket: "fixed" }],
    salaryVersion: 1, bankVersion: 1, unreadable: [],
    bank: { routingCode: "803320101", iban: "AE070331234567890123456",
      ibanLast4: "3456" },
  };
}

const rows = { self: row(SELF, null), report: row(REPORT, SELF),
  other: row(OTHER, null) };

type Who = keyof typeof rows;
/** [salary, bank, labourPersonId and emiratesIdNumber] visible. */
const TABLE: Record<Role, Record<Who, [boolean, boolean, boolean]>> = {
  owner: { self: [true, true, true], report: [true, true, true],
    other: [true, true, true] },
  hr: { self: [true, true, true], report: [true, true, true],
    other: [true, true, true] },
  manager: { self: [true, true, false], report: [false, false, false],
    other: [false, false, false] },
  employee: { self: [true, true, false], report: [false, false, false],
    other: [false, false, false] },
};

describe("toEmployeeView redaction", () => {
  for (const role of ["owner", "hr", "manager", "employee"] as const) {
    for (const who of ["self", "report", "other"] as const) {
      it(`${role} viewing ${who}`, () => {
        const v = toEmployeeView(rows[who], { role, employeeId: SELF },
          "2026-03-01");
        expect(EmployeeView.safeParse(v).success).toBe(true);
        const [salary, bank, ids] = TABLE[role][who];
        expect(v.salary !== null, "salary").toBe(salary);
        expect(v.bank !== null, "bank").toBe(bank);
        expect(v.labourPersonId !== null, "labourPersonId").toBe(ids);
        expect(v.emiratesIdNumber !== null, "emiratesIdNumber").toBe(ids);
        expect(JSON.stringify(v)).not.toContain("AE07033123");
        if (salary) expect(v.salary?.[0]?.amount).toBe("7777.77");
      });
    }
  }
  it("status is left once the last working day has passed", () => {
    const r = { ...rows.self, lastWorkingDate: "2026-02-28" };
    const view = (today: string) => toEmployeeView(r,
      { role: "owner", employeeId: null }, today).status;
    expect(view("2026-02-28")).toBe("active");
    expect(view("2026-03-01")).toBe("left");
  });
});

describe("viewerScope", () => {
  it("owner and hr see all; manager self and reports; employee self", () => {
    const see = (role: Role, employeeId: string | null) =>
      Object.entries(rows).filter(([, r]) => inScope(viewerScope(
        { role, employeeId }), r)).map(([k]) => k);
    expect(see("owner", null)).toEqual(["self", "report", "other"]);
    expect(see("hr", null)).toEqual(["self", "report", "other"]);
    expect(see("manager", SELF)).toEqual(["self", "report"]);
    expect(see("employee", REPORT)).toEqual(["report"]);
    expect(see("manager", null)).toEqual([]);
    expect(see("employee", null)).toEqual([]);
  });
});
