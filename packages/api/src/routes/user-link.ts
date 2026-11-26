import type { UserEmployeeLink } from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

type LinkCtx = ReqCtx<UserEmployeeLink, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

/** The employee exists and no other login or open invite holds it. */
async function assertLinkable(ctx: LinkCtx, employeeId: string) {
  const e = await ctx.tx.query(
    "SELECT 1 FROM employees WHERE company_id = $1 AND id = $2 FOR UPDATE",
    [co(ctx), employeeId]);
  if (e.length === 0) {
    throw new ApiError("NOT_FOUND", "No such employee",
      { fields: ["body.employeeId"] });
  }
  const taken = await ctx.tx.query(
    `SELECT 1 FROM memberships WHERE company_id = $1 AND employee_id = $2
       AND user_id <> $3
     UNION ALL
     SELECT 1 FROM invites WHERE company_id = $1 AND employee_id = $2
       AND used_at IS NULL AND expires_at > $4`,
    [co(ctx), employeeId, ctx.params.id, ctx.deps.now().toISOString()]);
  if (taken.length > 0) throw new ApiError("EMPLOYEE_ALREADY_LINKED");
}

async function userView(ctx: LinkCtx) {
  const [r] = await ctx.tx.query<{ user_id: string; email: string;
    display_name: string; role: string; employee_id: string | null;
    mfa_enrolled: boolean }>(
    `SELECT m.user_id, u.email, u.display_name, m.role, m.employee_id,
       u.mfa_enrolled FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1 AND m.user_id = $2`, [co(ctx), ctx.params.id]);
  return { userId: r!.user_id, email: r!.email,
    displayName: r!.display_name, role: r!.role,
    employeeId: r!.employee_id, mfaEnrolled: r!.mfa_enrolled };
}

/**
 * Owner with MFA links (or unlinks) a member's login to an employee
 * record (Plan 8 review C-1), so exits find and revoke it. One login
 * per employee record (Plan 3 M-7 index).
 */
async function linkUserEmployee(ctx: LinkCtx) {
  const [m] = await ctx.tx.query(
    `SELECT 1 FROM memberships WHERE company_id = $1 AND user_id = $2
     AND revoked_at IS NULL FOR UPDATE`, [co(ctx), ctx.params.id]);
  if (m === undefined) throw new ApiError("NOT_FOUND");
  const emp = ctx.body.employeeId;
  if (emp !== null) await assertLinkable(ctx, emp);
  await ctx.tx.query(
    `UPDATE memberships SET employee_id = $3 WHERE company_id = $1
     AND user_id = $2`, [co(ctx), ctx.params.id, emp]);
  await appendAudit(ctx.tx, { companyId: co(ctx),
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "user.employee-linked", entityType: "user",
    entityId: ctx.params.id,
    data: emp === null ? { changed: ["employeeId"] } : { employeeId: emp } });
  return userView(ctx);
}

export function registerUserLinkRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "linkUserEmployee", linkUserEmployee);
}
