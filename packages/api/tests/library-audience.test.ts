import { describe, expect, it } from "vitest";
import { inAudience } from "../src/library/audience";

const D = "00000000-0000-4000-8000-0000000000d1";
const D2 = "00000000-0000-4000-8000-0000000000d2";
const E = "00000000-0000-4000-8000-0000000000e1";
const none = { allStaff: false, departmentIds: [], employeeIds: [],
  roles: [] };

describe("inAudience", () => {
  it("matches a listed department", () => {
    expect(inAudience({ ...none, departmentIds: [D] },
      { employeeId: E, departmentId: D, role: "employee" })).toBe(true);
  });
  it("an empty audience matches nobody", () => {
    for (const role of ["owner", "hr", "manager", "employee"] as const) {
      expect(inAudience(none, { employeeId: E, departmentId: D, role }))
        .toBe(false);
    }
  });
  it("a role matches a member with no employee link", () => {
    expect(inAudience({ ...none, roles: ["manager"] },
      { employeeId: null, departmentId: null, role: "manager" }))
      .toBe(true);
  });
  it("all staff matches everyone", () => {
    expect(inAudience({ ...none, allStaff: true },
      { employeeId: null, departmentId: null, role: null })).toBe(true);
  });
  it("a listed employee in another department matches", () => {
    expect(inAudience({ ...none, departmentIds: [D], employeeIds: [E] },
      { employeeId: E, departmentId: D2, role: "employee" })).toBe(true);
  });
});
