import { ROUTES, type RouteDef } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { enableMfa, call, makeApp, signup } from "./helpers/test-app";
import {
  IBAN_SENTINEL,
  SALARY_SENTINEL,
  seedCompany,
  type Seeded,
} from "./helpers/seed";

/**
 * Review Focus 1. The sentinels sit only on records the manager and
 * employee users may not see (the manager's second report and an
 * outsider); their own records carry other values. So only owner and
 * hr may ever receive a sentinel.
 */
type Role = "owner" | "hr" | "manager" | "employee";
const ROLES: Role[] = ["owner", "hr", "manager", "employee"];
type Target = keyof Seeded["emp"];
const TARGETS: Target[] = ["manager", "report", "report2", "outsider"];

/** Routes not built yet answer 404 before auth; later tasks shrink it. */
const NOT_BUILT = new Set(["listLeaveTypes", "listLeaveRequests",
  "getLeaveBalances", "listAttendance", "listMyPayslips", "getPayslip",
  "listPayRuns", "getPayRun", "listPayRunPayslips", "getSifFile",
  "downloadSifFile", "listAuditEvents", "verifyAuditChain"]);

/** `{id}` kinds per route; a GET tenant route missing here fails. */
const ID_KIND: Record<string, "employee" | null> = {
  getCompany: null, listUsers: null, listEmployees: null,
  getEmployee: "employee", getEmployeeBank: "employee",
  listDepartments: null,
};

/** Which targets a role may open on an employee `{id}` route. */
function visible(role: Role, t: Target): boolean {
  if (role === "owner" || role === "hr") return true;
  if (role === "manager") return t !== "outsider";
  return t === "report";
}

function expected(r: RouteDef, role: Role, t: Target | null): number {
  if (!r.roles.includes(role)) return 403;
  if (t !== null && !visible(role, t)) return 404;
  return r.status;
}

const getRoutes = ROUTES.filter((r) => r.method === "GET" &&
  r.auth === "tenant");

describe("no sensitive value leaks to a viewer who may not see it", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "leak");
  });
  const path = (r: RouteDef, id: string | null) =>
    id === null ? r.path : r.path.replace("{id}", id);

  it("every GET tenant route has a fixture or is listed as not built",
    () => {
      for (const r of getRoutes) {
        expect(NOT_BUILT.has(r.id) || r.id in ID_KIND, r.id).toBe(true);
        expect(NOT_BUILT.has(r.id) && r.id in ID_KIND, r.id).toBe(false);
      }
    });

  for (const r of getRoutes) {
    it(`${r.id}`, async () => {
      if (NOT_BUILT.has(r.id)) {
        const res = await call(ctx.app, s.owner.token, s.companyId, "GET",
          r.path.replace("{id}", s.emp.report));
        expect(res.status).toBe(404);
        return;
      }
      const targets = ID_KIND[r.id] === "employee" ? TARGETS : [null];
      for (const role of ROLES) {
        for (const t of targets) {
          const res = await call(ctx.app, s[role].token, s.companyId,
            "GET", path(r, t === null ? null : s.emp[t]));
          const label = `${r.id} as ${role} on ${t}`;
          expect(res.status, `${label}: ${res.text}`)
            .toBe(expected(r, role, t));
          const leaked = res.text.includes(SALARY_SENTINEL) ||
            res.text.includes(IBAN_SENTINEL);
          if (role === "manager" || role === "employee") {
            expect(leaked, label).toBe(false);
          }
        }
      }
    });
  }

  it("owner bodies do carry the sentinels (the test is not vacuous)",
    async () => {
      const list = await call(ctx.app, s.owner.token, s.companyId, "GET",
        "/v1/employees");
      expect(list.text).toContain(SALARY_SENTINEL);
      const bank = await call(ctx.app, s.owner.token, s.companyId, "GET",
        `/v1/employees/${s.emp.outsider}/bank`);
      expect(bank.text).toContain(IBAN_SENTINEL);
    });

  it("company B's owner gets 404 for every A id", async () => {
    const b = await signup(ctx.app, "other");
    const mfa = await enableMfa(ctx.app, ctx.clock, b);
    for (const r of getRoutes.filter((x) => x.path.includes("{id}"))) {
      for (const t of TARGETS) {
        const res = await call(ctx.app, mfa.token, b.companyId, "GET",
          path(r, s.emp[t]));
        expect(res.status, `${r.id} ${t}`).toBe(404);
      }
    }
  });
});
