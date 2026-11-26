import { ROUTES, type RouteDef } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { enableMfa, call, makeApp, signup } from "./helpers/test-app";
import {
  addOwner,
  march,
  postRun,
  IBAN_SENTINEL,
  SALARY_SENTINEL,
  seedCompany,
  type Seeded,
} from "./helpers/seed";
import { TIME_ID_KIND, TIME_QUERY } from "./helpers/leak-time";

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

type Kind = "employee" | "payslip" | "payRun" | "sifFile" | null;
/** `{id}` kinds per route; a GET tenant route missing here fails. */
const ID_KIND: Record<string, Kind> = {
  getCompany: null, listUsers: null, listEmployees: null,
  getEmployee: "employee", getEmployeeBank: "employee",
  listDepartments: null, listLeaveTypes: null, listLeaveRequests: null,
  getLeaveBalances: "employee", listAttendance: null,
  listMyPayslips: null, getPayslip: "payslip", listPayRuns: null,
  getPayRun: "payRun", listPayRunPayslips: "payRun",
  getSifFile: "sifFile", downloadSifFile: "sifFile",
  listAuditEvents: null, verifyAuditChain: null,
  ...TIME_ID_KIND,
};

/** Query strings a route needs. */
const QUERY: Record<string, string> = {
  listAttendance: "?from=2026-01-01&to=2026-12-31",
  getLeaveBalances: "?year=2026",
  ...TIME_QUERY,
};

/** Which targets a role may open on an employee or payslip route. */
function visible(role: Role, t: Target, kind: Kind): boolean {
  if (role === "owner" || role === "hr") return true;
  const own = role === "manager" ? "manager" : "report";
  if (kind === "payslip") return t === own;
  return role === "manager" ? t !== "outsider" : t === "report";
}

function expected(r: RouteDef, role: Role, t: Target | null): number {
  if (!r.roles.includes(role)) return 403;
  if (t !== null && !visible(role, t, ID_KIND[r.id] ?? null)) return 404;
  return r.status;
}

const getRoutes = ROUTES.filter((r) => r.method === "GET" &&
  r.auth === "tenant");

describe("no sensitive value leaks to a viewer who may not see it", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  let runId: string;
  let sifId: string;
  const slips = {} as Record<Target, string>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "leak");
    const owner2 = await addOwner(ctx, s);
    runId = (await postRun(ctx, s.hr, s, "leak-1", march)).body.id;
    await call(ctx.app, owner2.token, s.companyId, "POST",
      `/v1/pay-runs/${runId}/approve`);
    const all = await call(ctx.app, s.hr.token, s.companyId, "GET",
      `/v1/pay-runs/${runId}/payslips`);
    for (const t of TARGETS) {
      slips[t] = all.body.items.find((p: { employeeId: string }) =>
        p.employeeId === s.emp[t]).id;
    }
    await call(ctx.app, s.owner.token, s.companyId, "PATCH", "/v1/company",
      { wps: { employerId: "0000000123456", bankRoutingCode: "802420101" } });
    sifId = (await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/pay-runs/${runId}/sif`)).body.id;
  });
  /** Every `{id}` to try for a route, with the record it belongs to. */
  const idsFor = (kind: Kind): [Target | null, string | null][] =>
    kind === "employee" ? TARGETS.map((t) => [t, s.emp[t]])
    : kind === "payslip" ? TARGETS.map((t) => [t, slips[t]])
    : kind === "payRun" ? [[null, runId]]
    : kind === "sifFile" ? [[null, sifId]] : [[null, null]];
  const path = (r: RouteDef, id: string | null) =>
    (id === null ? r.path : r.path.replace("{id}", id)) +
    (QUERY[r.id] ?? "");

  it("every GET tenant route has a fixture", () => {
    for (const r of getRoutes) expect(r.id in ID_KIND, r.id).toBe(true);
  });

  for (const r of getRoutes) {
    it(`${r.id}`, async () => {
      for (const role of ROLES) {
        for (const [t, id] of idsFor(ID_KIND[r.id] ?? null)) {
          const res = await call(ctx.app, s[role].token, s.companyId,
            "GET", path(r, id));
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
      const slips = await call(ctx.app, s.owner.token, s.companyId, "GET",
        `/v1/pay-runs/${runId}/payslips`);
      expect(slips.text).toContain(SALARY_SENTINEL);
      const mine = await call(ctx.app, s.employee.token, s.companyId,
        "GET", "/v1/me/payslips");
      expect(mine.body.items.length).toBe(1);
      const file = await call(ctx.app, s.owner.token, s.companyId, "GET",
        `/v1/sif-files/${sifId}/download`);
      expect(file.text).toContain(IBAN_SENTINEL);
    });

  it("company B's owner gets 404 for every A id", async () => {
    const b = await signup(ctx.app, "other");
    const mfa = await enableMfa(ctx.app, ctx.clock, b);
    const kinds: Kind[] = ["employee", "payslip", "payRun", "sifFile"];
    const allIds = kinds.flatMap((k) => idsFor(k).map(([, id]) => id!));
    for (const r of getRoutes.filter((x) => x.path.includes("{id}"))) {
      for (const id of allIds) {
        const res = await call(ctx.app, mfa.token, b.companyId, "GET",
          path(r, id));
        expect(res.status, `${r.id} ${id}`).toBe(404);
      }
    }
  });
});
