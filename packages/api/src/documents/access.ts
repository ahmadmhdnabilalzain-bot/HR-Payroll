import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

/** full: owner, hr, the person; limited: the person's manager. */
export type Access = "full" | "limited";

export interface EmpBrief {
  id: string;
  manager_id: string | null;
  full_name: string;
  last_working_date: string | null;
}

type Ctx = Pick<ReqCtx, "tx" | "tenant">;

export const isPayroll = (ctx: Pick<ReqCtx, "tenant">) =>
  ctx.tenant!.role === "owner" || ctx.tenant!.role === "hr";

export async function empBrief(ctx: Ctx, id: string)
  : Promise<EmpBrief | null> {
  const [e] = await ctx.tx.query<EmpBrief>(
    `SELECT id, manager_id, full_name, last_working_date FROM employees
     WHERE company_id = $1 AND id = $2`, [ctx.tenant!.companyId, id]);
  return e ?? null;
}

/** How the caller may see an employee's documents; anyone else 404. */
export function accessOf(ctx: Pick<ReqCtx, "tenant">, e: EmpBrief)
  : Access | null {
  const own = ctx.tenant!.employeeId;
  if (isPayroll(ctx) || (own !== null && e.id === own)) return "full";
  if (ctx.tenant!.role === "manager" && own !== null &&
    e.manager_id === own) return "limited";
  return null;
}

/** The employee's brief and the caller's access, else 404. */
export async function viewAccess(ctx: Ctx, employeeId: string)
  : Promise<{ emp: EmpBrief; access: Access }> {
  const emp = await empBrief(ctx, employeeId);
  const access = emp === null ? null : accessOf(ctx, emp);
  if (emp === null || access === null) throw new ApiError("NOT_FOUND");
  return { emp, access };
}

/**
 * Who may add documents for `employeeId`: owner and hr for anyone in
 * the company; anyone else only for their own linked employee (no
 * link 422, another id 404).
 */
export async function writeAccess(ctx: Ctx, employeeId: string)
  : Promise<EmpBrief> {
  if (!isPayroll(ctx)) {
    const own = ctx.tenant!.employeeId;
    if (own === null) throw new ApiError("NO_EMPLOYEE_LINK");
    if (own !== employeeId) throw new ApiError("NOT_FOUND");
  }
  const emp = await empBrief(ctx, employeeId);
  if (emp === null) throw new ApiError("NOT_FOUND");
  return emp;
}
