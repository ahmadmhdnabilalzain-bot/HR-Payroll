import {
  approvedClaim,
  EXPENSE_START,
  meal,
  setupExpenses,
  type Cats,
} from "./expense-fixtures";
import {
  addOwner,
  salaryOf,
  seedCompany,
  type Seeded,
  type SeedUser,
} from "./seed";
import { call, makeApp } from "./test-app";

export type Ctx = Awaited<ReturnType<typeof makeApp>>;
export const MARCH = { period: { year: 2026, month: 3 }, entries: [] };
export const APRIL = { period: { year: 2026, month: 4 }, entries: [] };

/** A company for pay-run tests: second owner, expense setup, and the
 * employee user's record on basic 4000.00 plus housing 1500.00. */
export interface World { ctx: Ctx; s: Seeded; o2: SeedUser; cats: Cats }

export async function world(name: string, db?: Ctx["deps"]["db"])
  : Promise<World> {
  const ctx = await makeApp(db === undefined ? { start: EXPENSE_START }
    : { start: EXPENSE_START, db });
  const s = await seedCompany(ctx, name);
  const o2 = await addOwner(ctx, s);
  const cats = await setupExpenses(ctx, s);
  await call(ctx.app, s.owner.token, s.companyId, "PUT",
    `/v1/employees/${s.emp.report}/salary`, salaryOf("4000.00"));
  return { ctx, s, o2, cats };
}

export const as = (w: World, u: SeedUser, method: string, path: string,
  body?: unknown) => call(w.ctx.app, u.token, w.s.companyId, method, path,
  body);

/** An approved claim of the employee user (approved by the manager). */
export const claimOf = (w: World, amount: string, vat = "0.00") =>
  approvedClaim(w.ctx, w.s.employee, w.s.manager, w.s,
    [meal(w.cats, amount, { vatAmount: vat })]);

/** An approved claim hr files for `employeeId` (owner approves). */
export const claimFor = (w: World, employeeId: string, amount: string,
  date = "2026-03-10") => approvedClaim(w.ctx, w.s.hr, w.s.owner, w.s,
  [meal(w.cats, amount, { date })], { employeeId });

export const claim = (w: World, id: string) =>
  as(w, w.s.hr, "GET", `/v1/expense-claims/${id}`);

export const slipOf = async (w: World, runId: string, employeeId: string) =>
  (await as(w, w.s.hr, "GET", `/v1/pay-runs/${runId}/payslips`)).body
    .items.find((p: { employeeId: string }) => p.employeeId === employeeId);
