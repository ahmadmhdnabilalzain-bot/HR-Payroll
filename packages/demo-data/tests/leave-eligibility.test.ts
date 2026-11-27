import { describe, expect, it } from "vitest";
import { buildDemoCompany } from "../src";
import { FEMALE, MALE, STAFF } from "../src/roster-data";

/** Maternity leave follows the person's file, never a default. */
describe("leave eligibility", () => {
  const c = buildDemoCompany();

  it("has-a-gender-for-every-one-of-the-31", () => {
    const names = STAFF.map((x) => x.name);
    expect(names).toHaveLength(31);
    expect(FEMALE.filter((n) => MALE.includes(n))).toEqual([]);
    expect([...FEMALE, ...MALE].sort()).toEqual([...names].sort());
    expect(c.employees.filter((e) => e.gender === "female"))
      .toHaveLength(16);
    expect(c.employees.find((e) => e.fullName === "Jose Reyes")?.gender)
      .toBe("male");
    expect(c.employees.find((e) => e.fullName === "Fatima Al Ketbi")
      ?.gender).toBe("female");
  });

  it("keeps-maternity-for-female-employees-and-says-so", () => {
    const mat = c.leaveTypes.find((t) => t.id === "lt-maternity")!;
    expect(mat.rule.onlyFor).toBe("female");
    expect(mat.rule.who?.en).toBe("For female employees.");
    const others = c.leaveTypes.filter((t) => t.id !== "lt-maternity");
    expect(others.every((t) => t.rule.onlyFor === null &&
      t.rule.who === null)).toBe(true);
  });

  it("seeds-no-maternity-leave-for-a-man", () => {
    const men = new Set(c.employees.filter((e) => e.gender === "male")
      .map((e) => e.id));
    expect(c.leaveRequests.filter((r) => r.leaveTypeId === "lt-maternity"
      && men.has(r.employeeId))).toEqual([]);
  });
});
