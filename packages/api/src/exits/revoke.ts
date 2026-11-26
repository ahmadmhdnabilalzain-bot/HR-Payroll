import type {
  AccessResult,
  LeaverLogin,
  RevokeRequest,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";
import { addRun } from "./hook-runs";
import { storedAccess } from "./exit-hooks-view";
import type { ExitRow } from "./exit-rows";
import { visibleExit } from "./exits";
import { leaverLogins, stillActive } from "./leaver-logins";
import { assertNotSubject } from "./subject";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

/**
 * Marks this company's unused invites for the leaver as used: those
 * linked to the employee record and those sent to the email of a login
 * being revoked, so only a new invite can restore access.
 */
async function closeInvites(ctx: ReqCtx, x: ExitRow, userIds: string[]) {
  await ctx.tx.query(
    `UPDATE invites SET used_at = $4 WHERE company_id = $1
     AND used_at IS NULL AND (employee_id = $2 OR lower(email) IN
       (SELECT lower(u.email) FROM users u WHERE u.id = ANY($3::uuid[])))`,
    [co(ctx), x.employeeId, userIds, ctx.deps.now().toISOString()]);
}

/** HR's "not the leaver" list must name listed, active logins. */
function targetsOf(ls: LeaverLogin[], others: string[]): LeaverLogin[] {
  const live = stillActive(ls);
  if (others.some((id) => !live.some((l) => l.userId === id))) {
    throw new ApiError("VALIDATION_FAILED", "Not a listed active login",
      { fields: ["body.notTheLeaver"] });
  }
  return live.filter((l) => !others.includes(l.userId));
}

/**
 * Owner rows are locked first (as for role changes): revoking may not
 * leave the company with no owner (409 LAST_OWNER, nothing changed).
 * Removing an owner or hr login needs an owner (review I-3).
 */
async function checkTargets(ctx: ReqCtx, targets: LeaverLogin[]) {
  const owners = await ctx.tx.query<{ user_id: string }>(
    `SELECT user_id FROM memberships WHERE company_id = $1
     AND role = 'owner' AND revoked_at IS NULL ORDER BY user_id
     FOR UPDATE`, [co(ctx)]);
  const lost = targets.filter((t) => t.role === "owner").length;
  if (lost > 0 && owners.length - lost < 1) throw new ApiError("LAST_OWNER");
  const senior = targets.some((t) => t.role === "owner" || t.role === "hr");
  if (senior && ctx.tenant!.role !== "owner") {
    throw new ApiError("FORBIDDEN", "Only an owner may revoke an owner " +
      "or hr login");
  }
}

async function revokeInApp(ctx: ReqCtx, x: ExitRow, targets: LeaverLogin[],
  others: string[]): Promise<"revoked" | "no-login"> {
  await checkTargets(ctx, targets);
  const ids = targets.map((t) => t.userId);
  await closeInvites(ctx, x, ids);
  for (const id of others) {
    await addRun(ctx, x.id, "access-confirm", { kind: "not-the-leaver",
      status: "confirmed", ref: id });
  }
  if (ids.length === 0) return "no-login";
  await ctx.tx.query(
    `UPDATE memberships SET revoked_at = $3, revoked_by = $4
     WHERE company_id = $1 AND user_id = ANY($2::uuid[])
     AND revoked_at IS NULL`,
    [co(ctx), ids, ctx.deps.now().toISOString(), ctx.user!.id]);
  return "revoked";
}

async function revokeExternal(ctx: ReqCtx, x: ExitRow) {
  try {
    const r = await ctx.deps.access.revoke({ companyId: co(ctx),
      exitId: x.id, employeeId: x.employeeId });
    return r.status;
  } catch {
    return "failed" as const;
  }
}

async function firstRun(ctx: IdCtx<RevokeRequest>, x: ExitRow,
  ls: LeaverLogin[]): Promise<AccessResult> {
  const others = [...new Set(ctx.body.notTheLeaver ?? [])];
  const inApp = await revokeInApp(ctx, x, targetsOf(ls, others), others);
  const external = await revokeExternal(ctx, x);
  await addRun(ctx, x.id, "access", { kind: "in-app", status: inApp,
    ref: null });
  await addRun(ctx, x.id, "access", { kind: "external", status: external,
    ref: null });
  await auditFor(ctx, "exit", "exit.access-revoked", x.id,
    { inApp, external });
  return { inApp, external, at: ctx.deps.now().toISOString(),
    beforeLastDay: dubaiDate(ctx.deps.now()) < x.lastWorkingDate };
}

/**
 * Owner or hr with MFA, never the leaver. Revokes every active login
 * the server lists (linked or same email) except those HR confirms are
 * someone else's. A repeat returns the stored result without calling
 * the port again, but still revokes any login restored meanwhile.
 */
export async function revokeAccess(ctx: IdCtx<RevokeRequest>) {
  const x = await visibleExit(ctx, true);
  await assertNotSubject(ctx, x);
  const ls = await leaverLogins(ctx.tx, co(ctx), x);
  const done = await storedAccess(ctx.tx, co(ctx), x);
  if (done !== null) {
    const again = stillActive(ls);
    if (again.length > 0) await revokeInApp(ctx, x, again, []);
    return done;
  }
  if (x.status !== "in-notice") throw new ApiError("EXIT_NOT_APPROVED");
  return firstRun(ctx, x, ls);
}
