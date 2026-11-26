import type {
  LoginRequest,
  LoginResponse,
  MfaConfirmRequest,
  SignupRequest,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { insertMembership, insertUser, userByEmail, userById } from
  "../auth/accounts";
import { freshTotpStep, login, meOf, signedIn } from
  "../auth/login";
import { hashPassword } from "../auth/password";
import { expireSession, markSessionMfa } from "../auth/session";
import { base32Encode } from "../auth/totp";
import type { Db } from "../db/db";
import { withTenant } from "../db/tenant";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

const ISSUER = "HR Payroll";

const isUniqueViolation = (e: unknown) =>
  (e as { code?: unknown }).code === "23505";

async function createAll(ctx: ReqCtx<SignupRequest>, passwordHash: string,
  ids: { companyId: string; userId: string }): Promise<LoginResponse> {
  const { deps, body: b } = ctx;
  const at = deps.now().toISOString();
  return withTenant(deps.db, ids, async (tx) => {
    if (await userByEmail(tx, b.email) !== null) {
      throw new ApiError("EMAIL_TAKEN");
    }
    await insertUser(tx, { id: ids.userId, email: b.email,
      displayName: b.displayName, passwordHash, at });
    await tx.query(
      `INSERT INTO companies (id, name, dek_wrapped, created_at)
       VALUES ($1, $2, $3, $4)`, [ids.companyId, b.companyName,
        deps.keyring.wrapNewDek(ids.companyId).dekWrapped, at]);
    await insertMembership(tx, { ...ids, role: "owner", employeeId: null,
      at });
    await appendAudit(tx, { companyId: ids.companyId, at,
      actorUserId: ids.userId, action: "company.created",
      entityType: "company", entityId: ids.companyId, data: {} });
    return signedIn(tx, deps, ids.userId, false);
  });
}

async function signup(ctx: ReqCtx<SignupRequest>) {
  const { deps } = ctx;
  const ids = { companyId: deps.newId(), userId: deps.newId() };
  const hash = await hashPassword(ctx.body.password, deps.passwordCost,
    deps.randomBytes(16));
  try {
    return await createAll(ctx, hash, ids);
  } catch (e) {
    if (isUniqueViolation(e)) throw new ApiError("EMAIL_TAKEN");
    throw e;
  }
}

const asUser = <T>(deps: AppDeps, userId: string,
  fn: (tx: Db) => Promise<T>) =>
  withTenant(deps.db, { companyId: null, userId }, fn);

async function enrolMfa(ctx: ReqCtx) {
  const { deps, user } = ctx;
  if (user!.mfa_enrolled) throw new ApiError("MFA_ALREADY_ENROLLED");
  const secret = base32Encode(deps.randomBytes(20));
  const enc = deps.keyring.encryptGlobal(`users:mfa_secret:${user!.id}`,
    secret);
  await asUser(deps, user!.id, (tx) => tx.query(
    "UPDATE users SET mfa_secret_enc = $2 WHERE id = $1", [user!.id, enc]));
  const label = encodeURIComponent(`${ISSUER}:${user!.email}`);
  const issuer = encodeURIComponent(ISSUER);
  return { secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}` +
    `&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` };
}

async function confirmMfa(ctx: ReqCtx<MfaConfirmRequest>) {
  const { deps, session } = ctx;
  return asUser(deps, ctx.user!.id, async (tx) => {
    const u = (await userById(tx, ctx.user!.id))!;
    if (u.mfa_enrolled) throw new ApiError("MFA_ALREADY_ENROLLED");
    if (u.mfa_secret_enc === null) throw new ApiError("MFA_NOT_STARTED");
    const step = freshTotpStep(deps, u, ctx.body.code);
    if (step === null) throw new ApiError("MFA_CODE_INVALID");
    await tx.query("UPDATE users SET mfa_enrolled = true, " +
      "mfa_last_step = $2 WHERE id = $1", [u.id, step]);
    await markSessionMfa(tx, session!.tokenHash);
    return meOf(tx, { ...u, mfa_enrolled: true },
      { mfa: true, expiresAt: session!.expiresAt });
  });
}

export function registerAuthRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "health", async () => ({ status: "ok" }));
  register(app, deps, "signup", signup);
  register(app, deps, "login", (ctx: ReqCtx<LoginRequest>) =>
    login(ctx.deps, ctx.body));
  register(app, deps, "logout", async (ctx) => {
    await asUser(deps, ctx.user!.id, (tx) =>
      expireSession(tx, ctx.session!.tokenHash, deps.now()));
    return null;
  });
  register(app, deps, "getMe", (ctx) => asUser(deps, ctx.user!.id,
    (tx) => meOf(tx, ctx.user!, ctx.session!)));
  register(app, deps, "enrolMfa", enrolMfa);
  register(app, deps, "confirmMfa", confirmMfa);
}
