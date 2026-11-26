import { API_KEY_SCOPES, ROUTES, type RouteDef } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { enableMfa, call, makeApp, signup } from "./helpers/test-app";
import { inboundItemFor } from "./helpers/email-in";
import { EXPENSE_SENTINELS, seedExpenses } from "./helpers/seed-expenses";
import {
  addOwner,
  march,
  postRun,
  SENTINELS,
  seedCompany,
  type Seeded,
  type Target,
} from "./helpers/seed";
import {
  HR_ID_KIND,
  HR_KINDS,
  hrIdFor,
  hrOwnerPaths,
  hrSentinels,
  hrVisible,
} from "./helpers/leak-hr";
import { seedHr, type HrSeeded } from "./helpers/seed-hr";

/**
 * Review Focus 1. Each employee carries distinct values per field
 * (SENTINELS). For every role, every GET tenant route and every id,
 * no value the role may not see appears in the body: salary (also as
 * fils and as payslip gross), the full IBAN, the labour person id and
 * the Emirates ID.
 */
type Role = "owner" | "hr" | "manager" | "employee";
const ROLES: Role[] = ["owner", "hr", "manager", "employee"];
const TARGETS: Target[] = ["manager", "report", "report2", "outsider"];
const OWN: Record<Role, Target | null> = { owner: null, hr: null,
  manager: "manager", employee: "report" };

/** The strings a role must never receive. */
function forbidden(role: Role): string[] {
  if (role === "owner" || role === "hr") return [];
  return TARGETS.flatMap((t) => {
    const v = SENTINELS[t];
    // The full IBAN and the ids are owner/hr only, even for oneself.
    const always = [v.iban, v.labour, v.eid];
    return t === OWN[role] ? always
      : [...always, v.salary, v.fils, v.gross];
  });
}

type Kind = string | null;
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
  approvalInbox: null, listApprovalChains: null, getReceipt: "receipt",
  downloadReceipt: "receipt", listExpenseCategories: null,
  getExpensePolicy: null, listExpenseClaims: null, getExpenseClaim: "claim",
  expenseSummary: null, expenseVatRegister: null, expenseAging: null,
  expenseUnpaid: null, expensePayouts: null,
  ...HR_ID_KIND,
  getChannelSettings: null, listNotifications: null,
  getNotificationPrefs: null, listNotificationDeliveries: null,
  listNotificationTemplates: null, getMyChannels: null,
  getInboundSettings: null, listInboundItems: null,
  getInboundItem: "inboundItem", downloadInboundAttachment: "inboundItem",
  listCalendarFeeds: null, getSsoSettings: null,
  listWebhookEndpoints: null, listWebhookDeliveries: null,
  listApiKeys: null,
};

/** Query strings a route needs. */
const QUERY: Record<string, string> = {
  listAttendance: "?from=2026-01-01&to=2026-12-31",
  getLeaveBalances: "?year=2026",
  expenseSummary: "?from=2026-01-01&to=2026-12-31&groupBy=employee",
  expenseVatRegister: "?from=2026-01-01&to=2026-12-31",
};

/** Whose expense claims (and their receipts) a role may open. */
function seesClaimsOf(role: Role, t: Target): boolean {
  if (role === "owner" || role === "hr") return true;
  return role === "manager" ? t !== "outsider" : t === "report";
}

/** Which targets a role may open on an employee or payslip route. */
function visible(role: Role, t: Target | null, kind: Kind): boolean {
  if (kind !== null && HR_KINDS.includes(kind)) return hrVisible(role, kind);
  if (t === null) return true;
  if (kind === "claim" || kind === "receipt") return seesClaimsOf(role, t);
  if (role === "owner" || role === "hr") return true;
  const own = role === "manager" ? "manager" : "report";
  if (kind === "payslip") return t === own;
  return role === "manager" ? t !== "outsider" : t === "report";
}

function expected(r: RouteDef, role: Role, t: Target | null): number {
  if (!r.roles.includes(role)) return 403;
  const kind = ID_KIND[r.id] ?? null;
  if ((t !== null || kind !== null) && !visible(role, t, kind)) return 404;
  return r.status;
}

const getRoutes = ROUTES.filter((r) => r.method === "GET" &&
  r.auth === "tenant");

describe("no sensitive value leaks to a viewer who may not see it", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  let runId: string;
  let sifId: string;
  let inboundId: string;
  let hr: HrSeeded;
  const slips = {} as Record<Target, string>;
  let exp: Awaited<ReturnType<typeof seedExpenses>>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "leak");
    const owner2 = await addOwner(ctx, s);
    // Approved before the run, so payslips carry the reimbursements.
    exp = await seedExpenses(ctx, s);
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
    inboundId = await inboundItemFor(ctx, s);
    hr = await seedHr(ctx, s);
  });
  /** Every `{id}` to try for a route, with the record it belongs to. */
  const idsFor = (kind: Kind): [Target | null, string | null][] =>
    kind === "employee" ? TARGETS.map((t) => [t, s.emp[t]])
    : kind === "payslip" ? TARGETS.map((t) => [t, slips[t]])
    : kind === "payRun" ? [[null, runId]]
    : kind === "sifFile" ? [[null, sifId]]
    : kind === "inboundItem" ? [[null, inboundId]]
    : kind === "claim" ? TARGETS.map((t) => [t, exp.claims[t]])
    : kind === "receipt" ? TARGETS.map((t) => [t, exp.receipts[t]])
    : kind !== null ? [[null, hrIdFor(kind, hr)]] : [[null, null]];
  const path = (r: RouteDef, id: string | null) =>
    (id === null ? r.path : r.path.replace("{id}", id)
      .replace("{index}", "0")) +
    (r.id === "expensePayouts" ? `?payRunId=${runId}` : QUERY[r.id] ?? "");

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
          const leaked = [...forbidden(role), ...(role === "manager" ||
            role === "employee" ? hrSentinels(hr) : [])]
            .filter((x) => res.text.includes(x));
          expect(leaked, label).toEqual([]);
          for (const x of TARGETS.filter((x) => !seesClaimsOf(role, x))) {
            expect(res.text.includes(EXPENSE_SENTINELS[x]),
              `${label}: expense of ${x}`).toBe(false);
          }
        }
      }
    });
  }

  it("owner bodies do carry the sentinels (the test is not vacuous)",
    async () => {
      const get = (path: string) => call(ctx.app, s.owner.token,
        s.companyId, "GET", path);
      const list = await get("/v1/employees");
      const slips = await get(`/v1/pay-runs/${runId}/payslips`);
      for (const t of TARGETS) {
        const v = SENTINELS[t];
        for (const x of [v.salary, v.labour, v.eid]) {
          expect(list.text, `${t} ${x}`).toContain(x);
        }
        for (const x of [v.fils, v.gross]) {
          expect(slips.text, `${t} ${x}`).toContain(x);
        }
        const bank = await get(`/v1/employees/${s.emp[t]}/bank`);
        expect(bank.text).toContain(v.iban);
      }
      const mine = await call(ctx.app, s.employee.token, s.companyId,
        "GET", "/v1/me/payslips");
      expect(mine.body.items.length).toBe(1);
      const file = await get(`/v1/sif-files/${sifId}/download`);
      expect(file.text).toContain(SENTINELS.report2.iban);
      const claims = await get("/v1/expense-claims");
      for (const t of TARGETS) {
        expect(claims.text).toContain(EXPENSE_SENTINELS[t]);
      }
      expect(mine.body.items[0].reimbursementTotal)
        .toBe(EXPENSE_SENTINELS.report);
    });

  it("owner bodies carry the HR sentinels too", async () => {
    for (const [path, sentinel] of hrOwnerPaths(hr)) {
      const r = await call(ctx.app, s.owner.token, s.companyId, "GET",
        path);
      expect(r.text, path).toContain(sentinel);
    }
  });

  /** Every sentinel of every employee (an API key without payroll). */
  const allPayroll = () => TARGETS.flatMap((t) => {
    const v = SENTINELS[t];
    return [v.salary, v.fils, v.gross, v.iban, v.labour, v.eid];
  });
  const keyFor = async (scopes: string[]) => {
    const r = await call(ctx.app, s.owner.token, s.companyId, "POST",
      "/v1/api-keys", { name: `leak-${scopes.length}`, scopes,
        rateLimitPerMinute: 1200 });
    expect(r.status, r.text).toBe(201);
    return r.body.secret as string;
  };

  it("an API key without payroll:read never receives a sentinel",
    async () => {
      const scopes = ["employees:read", "employees:write", "leave:read",
        "leave:write", "attendance:read", "expenses:read"];
      const key = await keyFor(scopes);
      for (const r of getRoutes) {
        const scope = API_KEY_SCOPES[r.id];
        const want = scope !== undefined && scopes.includes(scope)
          ? r.status : 403;
        for (const [t, id] of idsFor(ID_KIND[r.id] ?? null)) {
          const res = await call(ctx.app, key, s.companyId, "GET",
            path(r, id));
          const label = `${r.id} as API key on ${t}`;
          expect(res.status, `${label}: ${res.text}`).toBe(want);
          const leaked = [...allPayroll(), ...hrSentinels(hr)]
            .filter((x) => res.text.includes(x));
          expect(leaked, label).toEqual([]);
        }
      }
    });

  it("an API key with payroll:read does see salaries (not vacuous)",
    async () => {
      const key = await keyFor(["employees:read", "payroll:read"]);
      const list = await call(ctx.app, key, s.companyId, "GET",
        "/v1/employees");
      for (const t of TARGETS) {
        expect(list.text, t).toContain(SENTINELS[t].salary);
      }
    });

  it("company B's owner gets 404 for every A id", async () => {
    const b = await signup(ctx.app, "other");
    const mfa = await enableMfa(ctx.app, ctx.clock, b);
    const kinds: Kind[] = ["employee", "payslip", "payRun", "sifFile",
      "claim", "receipt", "inboundItem", ...HR_KINDS];
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
