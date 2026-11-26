import { IBAN_SENTINEL, SALARY_SENTINEL } from "@payroll/contract";
import {
  call,
  enableMfa,
  PASSWORD,
  signup,
  type Clock,
} from "./test-app";
import type { App } from "../../src/http/context";

export { IBAN_SENTINEL, SALARY_SENTINEL };

export type Target = "manager" | "report" | "report2" | "outsider";

/**
 * A distinct value per employee and field, so a leak shows whose data
 * leaked. No value is a substring of another, of "1500.00" or of an
 * id. `fils` and `gross` are the derived forms (trace result, payslip
 * gross with housing 1500.00).
 */
export const SENTINELS: Record<Target, { salary: string; fils: string;
  gross: string; iban: string; labour: string; eid: string }> = {
  manager: { salary: "1111.11", fils: "111111", gross: "2611.11",
    iban: "AE110000000000000000011", labour: "77000000000001",
    eid: "784199000000111" },
  report: { salary: "2222.22", fils: "222222", gross: "3722.22",
    iban: "AE220000000000000000022", labour: "77000000000002",
    eid: "784199000000222" },
  report2: { salary: SALARY_SENTINEL, fils: "777777", gross: "9277.77",
    iban: IBAN_SENTINEL, labour: "77000000000003",
    eid: "784199000000333" },
  outsider: { salary: "6666.66", fils: "666666", gross: "8166.66",
    iban: "AE440000000000000000044", labour: "77000000000004",
    eid: "784199000000444" },
};

/** The viewers' own pay (manager and employee users). */
export const MANAGER_PAY = SENTINELS.manager.salary;
export const EMPLOYEE_PAY = SENTINELS.report.salary;
const ROUTING = "803320101";

export interface SeedUser {
  token: string;
  userId: string;
  email: string;
}

export interface Seeded {
  companyId: string;
  owner: SeedUser;
  hr: SeedUser;
  manager: SeedUser;
  employee: SeedUser;
  /** Employee records: the manager's and employee user's own, the
   * manager's second report and an outsider (see SENTINELS). */
  emp: { manager: string; report: string; report2: string;
    outsider: string };
}

type Ctx = { app: App; clock: Clock };

export function salaryOf(amount: string) {
  return { components: [
    { code: "basic", label: "Basic salary", labelAr: null, amount,
      sifBucket: "fixed" },
    { code: "housing", label: "Housing", labelAr: null, amount: "1500.00",
      sifBucket: "housing" },
  ] };
}

async function must(p: Promise<{ status: number; text: string; body: any }>,
  want: number) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

async function employee(ctx: Ctx, own: SeedUser, companyId: string,
  n: number, managerId: string | null, t: Target) {
  const v = SENTINELS[t];
  const body: Record<string, unknown> = { number: `E-${n}`,
    fullName: `Person ${n}`, jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate: "2019-01-01",
    labourPersonId: v.labour, emiratesIdNumber: v.eid };
  if (managerId !== null) body.managerId = managerId;
  const e = await must(call(ctx.app, own.token, companyId, "POST",
    "/v1/employees", body), 201);
  await must(call(ctx.app, own.token, companyId, "PUT",
    `/v1/employees/${e.id}/salary`, salaryOf(v.salary)), 200);
  await must(call(ctx.app, own.token, companyId, "PUT",
    `/v1/employees/${e.id}/bank`, { routingCode: ROUTING, iban: v.iban }),
  200);
  return e.id as string;
}

export async function member(ctx: Ctx, own: SeedUser, companyId: string,
  email: string, role: string, employeeId?: string): Promise<SeedUser> {
  const body: Record<string, string> = { email, role };
  if (employeeId !== undefined) body.employeeId = employeeId;
  const inv = await must(call(ctx.app, own.token, companyId, "POST",
    "/v1/users/invite", body), 201);
  const acc = await must(call(ctx.app, null, null, "POST",
    "/v1/auth/accept-invite", { setupToken: inv.setupToken,
      password: PASSWORD, displayName: role }), 200);
  const mfa = await enableMfa(ctx.app, ctx.clock, { token: acc.token,
    email });
  return { token: mfa.token, userId: acc.user.id, email };
}

/** A second owner (MFA): pay runs need an approver who did not create. */
export function addOwner(ctx: Ctx, s: Seeded): Promise<SeedUser> {
  return member(ctx, s.owner, s.companyId,
    `owner2.${s.companyId.slice(-4)}@example.com`, "owner");
}

/** POST /v1/pay-runs with an idempotency key. */
export function postRun(ctx: Ctx, who: SeedUser, s: Seeded, key: string,
  body: unknown) {
  return call(ctx.app, who.token, s.companyId, "POST", "/v1/pay-runs",
    body, { "idempotency-key": key });
}

export const march = { period: { year: 2026, month: 3 }, entries: [] };

/** A company with owner, hr, manager and employee users (all MFA). */
export async function seedCompany(ctx: Ctx, name: string): Promise<Seeded> {
  const a = await signup(ctx.app, name);
  const ownerMfa = await enableMfa(ctx.app, ctx.clock, a);
  const owner = { token: ownerMfa.token, userId: a.userId, email: a.email };
  const c = a.companyId;
  const m = await employee(ctx, owner, c, 1, null, "manager");
  const report = await employee(ctx, owner, c, 2, m, "report");
  const report2 = await employee(ctx, owner, c, 3, m, "report2");
  const outsider = await employee(ctx, owner, c, 4, null, "outsider");
  return {
    companyId: c, owner,
    hr: await member(ctx, owner, c, `hr.${name}@example.com`, "hr"),
    manager: await member(ctx, owner, c, `mgr.${name}@example.com`,
      "manager", m),
    employee: await member(ctx, owner, c, `emp.${name}@example.com`,
      "employee", report),
    emp: { manager: m, report, report2, outsider },
  };
}
