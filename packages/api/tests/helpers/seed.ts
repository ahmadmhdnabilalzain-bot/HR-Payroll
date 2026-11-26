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

/** The viewers' own values: never the sentinels. */
export const MANAGER_PAY = "1111.11";
export const EMPLOYEE_PAY = "2222.22";
const MANAGER_IBAN = "AE110000000000000000011";
const EMPLOYEE_IBAN = "AE220000000000000000022";
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
   * manager's second report and an outsider (both carry sentinels). */
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
  n: number, managerId: string | null, pay: string, iban: string) {
  const body: Record<string, unknown> = { number: `E-${n}`,
    fullName: `Person ${n}`, jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate: "2019-01-01",
    labourPersonId: `000000000000${String(n).padStart(2, "0")}` };
  if (managerId !== null) body.managerId = managerId;
  const e = await must(call(ctx.app, own.token, companyId, "POST",
    "/v1/employees", body), 201);
  await must(call(ctx.app, own.token, companyId, "PUT",
    `/v1/employees/${e.id}/salary`, salaryOf(pay)), 200);
  await must(call(ctx.app, own.token, companyId, "PUT",
    `/v1/employees/${e.id}/bank`, { routingCode: ROUTING, iban }), 200);
  return e.id as string;
}

async function member(ctx: Ctx, own: SeedUser, companyId: string,
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

/** A company with owner, hr, manager and employee users (all MFA). */
export async function seedCompany(ctx: Ctx, name: string): Promise<Seeded> {
  const a = await signup(ctx.app, name);
  const ownerMfa = await enableMfa(ctx.app, ctx.clock, a);
  const owner = { token: ownerMfa.token, userId: a.userId, email: a.email };
  const c = a.companyId;
  const m = await employee(ctx, owner, c, 1, null, MANAGER_PAY,
    MANAGER_IBAN);
  const report = await employee(ctx, owner, c, 2, m, EMPLOYEE_PAY,
    EMPLOYEE_IBAN);
  const report2 = await employee(ctx, owner, c, 3, m, SALARY_SENTINEL,
    IBAN_SENTINEL);
  const outsider = await employee(ctx, owner, c, 4, null, SALARY_SENTINEL,
    IBAN_SENTINEL);
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
