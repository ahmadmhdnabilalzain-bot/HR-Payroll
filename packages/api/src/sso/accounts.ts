import { appendAudit } from "../audit/audit";
import { insertMembership, userByEmail } from "../auth/accounts";
import { emitEvent } from "../channels/events";
import type { SsoProvider } from "../channels/ports";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { openInvite } from "../routes/users";
import { inviteEmailOk, jitEligible, type Identity } from "./identity";
import { ssoBody } from "./settings";

const NO_TENANT = { companyId: null, userId: null };

async function identityUser(tx: Db, p: SsoProvider, key: string) {
  const [r] = await tx.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM sso_identities WHERE provider = $1
       AND subject_key = $2 AND status = 'linked'`, [p, key]);
  return r ?? null;
}

async function addIdentity(tx: Db, ctx: ReqCtx, p: SsoProvider,
  id: Identity, userId: string): Promise<void> {
  const had = await identityUser(tx, p, id.subjectKey);
  if (had !== null && had.user_id !== userId) {
    throw new ApiError("SSO_IDENTITY_IN_USE");
  }
  if (had !== null) return;
  await tx.query(
    `INSERT INTO sso_identities (id, user_id, provider, subject_key, email,
       linked_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [ctx.deps.newId(), userId, p, id.subjectKey, id.email,
      ctx.deps.now().toISOString()]);
}

async function newUser(tx: Db, ctx: ReqCtx, id: Identity, email: string)
  : Promise<string> {
  const userId = ctx.deps.newId();
  await tx.query(
    `INSERT INTO users (id, email, display_name, password_hash, created_at)
     VALUES ($1, $2, $3, NULL, $4)`,
    [userId, email, id.displayName, ctx.deps.now().toISOString()]);
  return userId;
}

/** Links to the user who started it (bearer checked by the caller). */
export async function linkIdentity(ctx: ReqCtx, p: SsoProvider,
  id: Identity, userId: string): Promise<string> {
  await ctx.enter({ companyId: null, userId }, (tx) =>
    addIdentity(tx, ctx, p, id, userId));
  const companies = await ctx.enter({ companyId: null, userId }, (tx) =>
    tx.query<{ company_id: string }>("SELECT company_id FROM memberships " +
      "WHERE user_id = $1", [userId]));
  for (const c of companies) {
    await ctx.enter({ companyId: c.company_id, userId }, (tx) =>
      emitEvent({ tx, deps: ctx.deps, companyId: c.company_id },
        { type: "sso.linked", userId, provider: p }));
  }
  return userId;
}

/**
 * An invitation accepted through SSO keeps the role the owner chose.
 * The identity's email must equal the invite's (verified for Google,
 * a listed tenant for Microsoft). An existing account with that email
 * is never linked by email: it signs in with its password and links.
 */
export async function inviteAccept(ctx: ReqCtx, p: SsoProvider,
  id: Identity, token: string): Promise<string> {
  const companyId = token.split(".")[0]!;
  return ctx.enter({ companyId, userId: null }, async (tx) => {
    const inv = await openInvite(tx, ctx.deps, token);
    if (!inviteEmailOk(id, p, inv.email, (await ssoBody(tx, companyId))
      .body)) throw new ApiError("INVITE_EMAIL_MISMATCH");
    if (await userByEmail(tx, inv.email) !== null) {
      throw new ApiError("EMAIL_TAKEN");
    }
    const userId = await newUser(tx, ctx, id, inv.email.toLowerCase());
    await addIdentity(tx, ctx, p, id, userId);
    const at = ctx.deps.now().toISOString();
    await insertMembership(tx, { companyId, userId, role: inv.role,
      employeeId: inv.employee_id, at });
    await tx.query("UPDATE invites SET used_at = $2 WHERE id = $1",
      [inv.id, at]);
    await appendAudit(tx, { companyId, at, actorUserId: userId,
      action: "invite.accepted", entityType: "invite", entityId: inv.id,
      data: { role: inv.role } });
    return userId;
  });
}

async function jitIn(ctx: ReqCtx, p: SsoProvider, id: Identity,
  companyId: string): Promise<string | null> {
  return ctx.enter({ companyId, userId: null }, async (tx) => {
    const [e] = await tx.query<{ id: string }>(
      `SELECT e.id FROM employees e WHERE e.company_id = $1
         AND lower(e.email) = $2 AND NOT EXISTS (SELECT 1 FROM memberships m
           WHERE m.company_id = e.company_id AND m.employee_id = e.id)`,
      [companyId, id.email]);
    const ok = jitEligible({ identity: id, provider: p,
      settings: (await ssoBody(tx, companyId)).body,
      employeeMatch: e !== undefined,
      userWithEmailExists: await userByEmail(tx, id.email!) !== null });
    if (!ok) return null;
    const userId = await newUser(tx, ctx, id, id.email!);
    await addIdentity(tx, ctx, p, id, userId);
    const at = ctx.deps.now().toISOString();
    // Never any role but employee (Ruling 23).
    await insertMembership(tx, { companyId, userId, role: "employee",
      employeeId: e!.id, at });
    await appendAudit(tx, { companyId, at, actorUserId: userId,
      action: "sso.member-provisioned", entityType: "user",
      entityId: userId, data: { role: "employee" } });
    return userId;
  });
}

/**
 * A linked identity signs its user in. Otherwise only the one JIT
 * case may create an account; anything else is 401 SSO_NOT_LINKED.
 * Never links by email to an existing user.
 */
export async function loginUser(ctx: ReqCtx, p: SsoProvider, id: Identity)
  : Promise<string> {
  const linked = await ctx.enter(NO_TENANT, (tx) =>
    identityUser(tx, p, id.subjectKey));
  if (linked !== null) {
    await ctx.enter(NO_TENANT, (tx) => tx.query("UPDATE sso_identities " +
      "SET last_used_at = $2 WHERE id = $1",
    [linked.id, ctx.deps.now().toISOString()]));
    return linked.user_id;
  }
  if (id.email === null) throw new ApiError("SSO_NOT_LINKED");
  const domain = id.email.slice(id.email.lastIndexOf("@") + 1);
  const cands = await ctx.enter(NO_TENANT, (tx) => tx.query<{
    company_id: string }>("SELECT * FROM sso_jit_candidates($1, $2)",
  [id.email, domain]));
  if (cands.length !== 1) throw new ApiError("SSO_NOT_LINKED");
  const userId = await jitIn(ctx, p, id, cands[0]!.company_id);
  if (userId === null) throw new ApiError("SSO_NOT_LINKED");
  return userId;
}
