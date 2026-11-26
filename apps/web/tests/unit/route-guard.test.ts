import { describe, expect, it } from "vitest";
import type { Role } from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { mayOpen, roleAllows } from "../../src/nav/registry";
import type { AreaRoute } from "../../src/nav/types";

const ROLES: Role[] = ["hr", "gm", "it", "manager", "employee"];
const at = (hash: string): AreaRoute => {
  const [section, ...rest] = hash.split("/");
  return { section: section as AreaRoute["section"], rest };
};

describe("the shell's route guard", () => {
  it("every-static-area-opens-for-exactly-its-roles", () => {
    const key = (x: AreaRoute): string =>
      [x.section, ...(x.rest ?? [])].join("/");
    for (const a of ALL_AREAS) {
      const route = a.route;
      if (typeof route === "function" || (route.rest ?? []).length === 0)
        continue;
      const same = ALL_AREAS.filter((b) => b !== a &&
        typeof b.route !== "function" && key(b.route) === key(route));
      for (const r of ROLES) {
        const want = roleAllows(a, r) || same.some((b) => roleAllows(b, r));
        expect([a.id, r, mayOpen(r, route)]).toEqual([a.id, r, want]);
      }
    }
  });

  it("it-is-not-offered-what-shows-pay-or-people-records", () => {
    const ids = ["setup.parallel", "setup.cover"];
    for (const id of ids) {
      const a = ALL_AREAS.find((x) => x.id === id)!;
      expect([id, roleAllows(a, "it")]).toEqual([id, false]);
      expect([id, roleAllows(a, "hr")]).toEqual([id, true]);
    }
    expect(mayOpen("it", at("setup/migration/parallel"))).toBe(false);
    expect(mayOpen("it", at("people/more/cover"))).toBe(false);
    expect(mayOpen("it", at("setup/migration/fields"))).toBe(true);
  });

  it("own-profile-and-payslip-open", () => {
    expect(mayOpen("employee", at("people/emp-017"))).toBe(true);
    expect(mayOpen("employee", at("people/emp-017/payslip"))).toBe(true);
    expect(mayOpen("hr", at("people/emp-002/payslip"))).toBe(true);
    expect(mayOpen("employee", at("people"))).toBe(true);
    expect(mayOpen("manager", at("time-off"))).toBe(true);
  });

  it("it-opens-pay-setup-but-not-the-run", () => {
    expect(mayOpen("it", at("pay-run/groups"))).toBe(true);
    expect(mayOpen("it", at("pay-run/elements"))).toBe(true);
    expect(mayOpen("it", at("pay-run"))).toBe(false);
    expect(mayOpen("it", at("pay-run/review"))).toBe(false);
    expect(mayOpen("it", at("pay-run/xyz"))).toBe(false);
    expect(mayOpen("it", at("pay-run/loans/LN-2041"))).toBe(false);
    expect(mayOpen("hr", at("pay-run/loans/LN-2041"))).toBe(true);
    expect(mayOpen("hr", at("pay-run"))).toBe(true);
  });

  it("setup-and-reports-are-refused-to-staff", () => {
    for (const r of ["employee", "manager"] as const) {
      expect(mayOpen(r, at("setup"))).toBe(false);
      expect(mayOpen(r, at("setup/xyz"))).toBe(false);
      expect(mayOpen(r, at("setup/access/users"))).toBe(false);
      expect(mayOpen(r, at("reports"))).toBe(false);
      expect(mayOpen(r, at("reports/summary"))).toBe(false);
      expect(mayOpen(r, at("people/team/org"))).toBe(false);
    }
    expect(mayOpen("it", at("reports/summary"))).toBe(false);
    expect(mayOpen("it", at("reports/audit"))).toBe(true);
    expect(mayOpen("it", at("setup/access/users"))).toBe(true);
    expect(mayOpen("hr", at("reports/dashboard-exec"))).toBe(false);
  });

  it("records-follow-their-list", () => {
    expect(mayOpen("manager", at("time-off/overtime/crew/c-1"))).toBe(true);
    expect(mayOpen("employee", at("time-off/overtime/ot-1"))).toBe(false);
    expect(mayOpen("manager", at("people/papers/requests/r-1")))
      .toBe(false);
  });

  it("me-pages-are-the-staff-pages", () => {
    expect(mayOpen("employee", at("me/payslips"))).toBe(true);
    expect(mayOpen("hr", at("me/payslips"))).toBe(false);
  });
});
