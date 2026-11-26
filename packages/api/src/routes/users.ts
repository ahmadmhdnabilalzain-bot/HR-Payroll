import type {
  AcceptInviteRequest,
  InviteRequest,
  Role,
  RoleChange,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { insertMembership, insertUser, userByEmail } from
  "../auth/accounts";
import { signedIn, verifyCredentials } from "../auth/login";
import { hashPassword } from "../auth/password";
import { newSecret, tokenHash } from "../auth/session";
import type { Db } from "../db/db";
import { UUID } from "../db/tenant";
import type { AppDeps, HandlerDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

export const INVITE_MS = 72 * 3600 * 1000;

interface InviteRow {
  id: string;
  email: string;
  role: Role;
  employee_id: string | null;
  expires_at: string;
  used_at: string | null;
}

async function listUsers(ctx: ReqCtx) {
  const companyId = ctx.tenant!.companyId;
  const rows = await ctx.tx.query<{ user_id: string; email: string;
    display_name: string; role: Role; employee_id: string | null;
    mfa_enrolled: boolean }>(
    `SELECT m.user_id, u.email, u.display_name, m.role, m.employee_id,
       u.mfa_enrolled
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1 ORDER BY u.email`, [companyId]);
  return { items: rows.map((r) => ({ userId: r.user_id, email: r.email,
    displayName: r.display_name, role: r.role, employeeId: r.employee_id,
    mfaEnrolled: r.mfa_enrolled })) };
}

/** The setup token carries the company id so accept can set the tenant. */
async function inviteUser(ctx: ReqCtx<InviteRequest>) {
  const { deps, body } = ctx;
  const companyId = ctx.tenant!.companyId;
  if (body.employeeId !== undefined) {
    const e = await ctx.tx.query(
      "SELECT 1 FROM employees WHERE company_id = $1 AND id = $2",
      [companyId, body.employeeId]);
    if (e.length === 0) {
      throw new ApiError("NOT_FOUND", "No such employee",
        { fields: ["body.employeeId"] });
    }
  }
  const setupToken = `${companyId}.${newSecret(deps)}`;
  const now = deps.now();
  const expiresAt = new Date(now.getTime() + INVITE_MS).toISOString();
  const id = deps.newId();
  await ctx.tx.query(
    `INSERT INTO invites (id, company_id, token_hash, email, role,
       employee_id, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, companyId, tokenHash(setupToken), body.email, body.role,
      body.employeeId ?? null, ctx.user!.id, expiresAt]);
  await appendAudit(ctx.tx, { companyId, at: now.toISOString(),
    actorUserId: ctx.user!.id, action: "user.invited",
    entityType: "invite", entityId: id, data: { role: body.role } });
  return { setupToken, expiresAt };
}

/** Locks the invite row: parallel accepts queue, the losers get 410. */
async function openInvite(tx: Db, deps: HandlerDeps, token: string) {
  const [inv] = await tx.query<InviteRow>(
    `SELECT id, email, role, employee_id, expires_at, used_at
     FROM invites WHERE token_hash = $1 FOR UPDATE`, [tokenHash(token)]);
  if (inv === undefined) throw new ApiError("INVITE_NOT_FOUND");
  if (inv.used_at !== null) throw new ApiError("INVITE_USED");
  if (Date.parse(inv.expires_at) <= deps.now().getTime()) {
    throw new ApiError("INVITE_EXPIRED");
  }
  return inv;
}

/**
 * Creates the user, or links the existing one whose password was
 * already checked by `verifyCredentials` (same lockout as sign-in).
 */
async function userFor(tx: Db, ctx: ReqCtx<AcceptInviteRequest>,
  email: string, verifiedId: string | null): Promise<string> {
  const { deps, body } = ctx;
  const existing = await userByEmail(tx, email);
  if (existing !== null) {
    if (existing.id !== verifiedId) throw new ApiError("INVALID_CREDENTIALS");
    return existing.id;
  }
  const id = deps.newId();
  await insertUser(tx, { id, email, displayName: body.displayName,
    passwordHash: await hashPassword(body.password, deps.passwordCost,
      deps.randomBytes(16)), at: deps.now().toISOString() });
  return id;
}

async function acceptIn(tx: Db, ctx: ReqCtx<AcceptInviteRequest>,
  companyId: string, verifiedId: string | null): Promise<string> {
  const at = ctx.deps.now().toISOString();
  const inv = await openInvite(tx, ctx.deps, ctx.body.setupToken);
  const userId = await userFor(tx, ctx, inv.email, verifiedId);
  const member = await tx.query("SELECT 1 FROM memberships WHERE " +
    "company_id = $1 AND user_id = $2", [companyId, userId]);
  if (member.length > 0) throw new ApiError("ALREADY_MEMBER");
  await insertMembership(tx, { companyId, userId, role: inv.role,
    employeeId: inv.employee_id, at });
  await tx.query("UPDATE invites SET used_at = $2 WHERE id = $1",
    [inv.id, at]);
  await appendAudit(tx, { companyId, at, actorUserId: userId,
    action: "invite.accepted", entityType: "invite", entityId: inv.id,
    data: { role: inv.role } });
  return userId;
}

/** An existing account must pass the sign-in check, lockout included. */
async function verifiedExisting(ctx: ReqCtx<AcceptInviteRequest>,
  companyId: string): Promise<string | null> {
  const { deps, enter } = ctx;
  const email = await enter({ companyId, userId: null },
    async (tx) => (await openInvite(tx, deps, ctx.body.setupToken)).email);
  const existing = await enter({ companyId: null, userId: null },
    (tx) => userByEmail(tx, email));
  if (existing === null) return null;
  const ok = await verifyCredentials(enter, deps, { email,
    password: ctx.body.password });
  return ok.userId;
}

async function acceptInvite(ctx: ReqCtx<AcceptInviteRequest>) {
  const raw = ctx.body.setupToken.split(".")[0] ?? "";
  if (!UUID.test(raw)) throw new ApiError("INVITE_INVALID");
  const { deps } = ctx;
  const companyId = raw.toLowerCase();
  const verifiedId = await verifiedExisting(ctx, companyId);
  const userId = await ctx.enter({ companyId, userId: null },
    (tx) => acceptIn(tx, ctx, companyId, verifiedId));
  return ctx.enter({ companyId: null, userId },
    (tx) => signedIn(tx, deps, userId, false));
}

async function changeRole(tx: Db, ctx: ReqCtx<RoleChange, unknown,
  { id: string }>, companyId: string) {
  const target = ctx.params.id;
  // Lock every owner row first: two owners demoting each other at
  // once queue here, so the second sees one owner left.
  const owners = await tx.query<{ user_id: string }>(
    `SELECT user_id FROM memberships WHERE company_id = $1
     AND role = 'owner' ORDER BY user_id FOR UPDATE`, [companyId]);
  const [m] = await tx.query<{ role: Role }>(
    `SELECT role FROM memberships WHERE company_id = $1 AND user_id = $2
     FOR UPDATE`, [companyId, target]);
  if (m === undefined) throw new ApiError("NOT_FOUND");
  const to = ctx.body.role;
  if (m.role === "owner" && to !== "owner" && owners.length <= 1) {
    throw new ApiError("LAST_OWNER");
  }
  await tx.query("UPDATE memberships SET role = $3 WHERE company_id = $1 " +
    "AND user_id = $2", [companyId, target, to]);
  await appendAudit(tx, { companyId, at: ctx.deps.now().toISOString(),
    actorUserId: ctx.user!.id, action: "user.role-changed",
    entityType: "user", entityId: target, data: { from: m.role, to } });
}

/** Owner only, MFA session; the last owner cannot be demoted. */
async function changeUserRole(ctx: ReqCtx<RoleChange, unknown,
  { id: string }>) {
  const companyId = ctx.tenant!.companyId;
  await changeRole(ctx.tx, ctx, companyId);
  const list = await listUsers(ctx);
  return list.items.find((u) => u.userId === ctx.params.id);
}

export function registerUserRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listUsers", listUsers);
  register(app, deps, "changeUserRole", changeUserRole);
  register(app, deps, "inviteUser", inviteUser);
  register(app, deps, "acceptInvite", acceptInvite);
}
