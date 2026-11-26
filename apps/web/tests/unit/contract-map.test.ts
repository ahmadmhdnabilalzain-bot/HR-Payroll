import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  EXAMPLES,
  fromWireEmployee,
  fromWireMoney,
  fromWirePayRun,
  fromWirePayslip,
  fromWireSettlement,
  fromWireSifFile,
  routeById,
  toWireEmployee,
  toWireMoney,
  toWirePayslip,
  type Role,
} from "../../src/api/contract";
import {
  can,
  PERMISSIONS,
  type Permission,
} from "../../src/api/permissions";

describe("contract adapter", () => {
  it("money-round-trip", () => {
    expect(fromWireMoney("1234.00")).toBe(fils(123400n));
    expect(toWireMoney(fils(123400n))).toBe("1234.00");
    expect(toWireMoney(fils(5n))).toBe("0.05");
  });

  it("negative-refused", () => {
    expect(() => toWireMoney(fils(-1n))).toThrow(/NEGATIVE_AMOUNT/);
  });

  it("examples-map", () => {
    const e = fromWireEmployee(EXAMPLES["EmployeeView"] as never);
    expect(e.salary?.[0]?.amount).toBe(fils(777777n));
    expect(toWireEmployee(e)).toEqual(EXAMPLES["EmployeeView"]);
    const p = fromWirePayslip(EXAMPLES["Payslip"] as never);
    expect(p.gross).toBe(fils(777777n));
    expect(toWirePayslip(p)).toEqual(EXAMPLES["Payslip"]);
    expect(fromWirePayRun(EXAMPLES["PayRun"] as never).gross)
      .toBe(fils(777777n));
    expect(fromWireSifFile(EXAMPLES["SifFile"] as never).total)
      .toBe(fils(777777n));
    const s = fromWireSettlement(EXAMPLES["Settlement"] as never);
    expect(s.status).toBe("computed");
  });

  it("permissions-match-routes", () => {
    const routeOf: Record<Permission, string> = {
      "employees.read": "listEmployees",
      "employees.bank": "getEmployeeBank",
      "leave.decide": "approveLeaveRequest",
      "payroll.prepare": "createPayRun",
      "payroll.approve": "approvePayRun",
      "wps.generate": "generateSif",
      "company.edit": "updateCompany",
      "users.manage": "inviteUser",
      "audit.read": "listAuditEvents",
    };
    expect([...PERMISSIONS].sort()).toEqual(Object.keys(routeOf).sort());
    const roles: Role[] = ["owner", "hr", "manager", "employee"];
    for (const p of PERMISSIONS) {
      const granted = roles.filter((r) => can(r, p));
      const route = routeById(routeOf[p]).roles
        .filter((r) => r !== "employee");
      expect([p, granted]).toEqual([p, [...route]]);
    }
  });
});
