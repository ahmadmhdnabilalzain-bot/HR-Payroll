import type {
  LoginRequest,
  LoginResponse,
  MfaConfirmRequest,
  MfaEnrolRequest,
  SignupRequest,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { insertMembership, insertUser, userByEmail } from
  "../auth/accounts";
import {
  consumeTotp,
  credentialError,
  lockUser,
  login,
  meOf,
  passwordCheck,
  signedIn,
} from "../auth/login";
import { hashPassword } from "../auth/password";
import { expireSession, revokeOtherSessions } from "../auth/session";
import { base32Encode } from "../auth/totp";
import type { Db } from "../db/db";
import type { AppDeps } from "../deps";
import { Refuse, register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

const ISSUER = "HR Payroll";

const isUniqueViolation = (e: unknown) =>
  (e as { code?: unknown }).code === "23505";

async function createAll(tx: Db, ctx: ReqCtx<SignupRequest>,
  passwordHash: string, ids: { companyId: string; userId: string })
  : Promise<LoginResponse> {
  const { deps, body: b } = ctx;
  const at = deps.now().toISOString();
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
}

async function signup(ctx: ReqCtx<SignupRequest>) {
  const { deps } = ctx;
  const ids = { companyId: deps.newId(), userId: deps.newId() };
  const hash = await hashPassword(ctx.body.password, deps.passwordCost,
    deps.randomBytes(16));
  try {
    return await ctx.enter(ids, (tx) => createAll(tx, ctx, hash, ids));
  } catch (e) {
    if (isUniqueViolation(e)) throw new ApiError("EMAIL_TAKEN");
    throw e;
  }
}

/** Locks the caller's row and checks the password (lockout applies). */
async function reauthenticate(ctx: ReqCtx<{ password: string }>) {
  const u = (await lockUser(ctx.tx, { id: ctx.user!.id }))!;
  const pw = await passwordCheck(ctx.tx, ctx.deps, u, ctx.body.password);
  return { u, refused: pw === "ok" ? null : pw };
}

function securityLog(ctx: ReqCtx, event: string): void {
  ctx.deps.log({ requestId: ctx.requestId, event, userId: ctx.user!.id });
}

async function enrolMfa(ctx: ReqCtx<MfaEnrolRequest>) {
  const { deps } = ctx;
  if (ctx.user!.mfa_enrolled) throw new ApiError("MFA_ALREADY_ENROLLED");
  const { u, refused } = await reauthenticate(ctx);
  if (refused !== null) return new Refuse(credentialError(refused));
  const secret = base32Encode(deps.randomBytes(20));
  const enc = deps.keyring.encryptGlobal(`users:mfa_secret:${u.id}`,
    secret);
  await ctx.tx.query("UPDATE users SET mfa_secret_enc = $2 WHERE id = $1",
    [u.id, enc]);
  await revokeOtherSessions(ctx.tx, u.id, ctx.session!.tokenHash,
    deps.now());
  securityLog(ctx, "mfa.enrolment-started");
  const label = encodeURIComponent(`${ISSUER}:${u.email}`);
  const issuer = encodeURIComponent(ISSUER);
  return { secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}` +
    `&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` };
}

/** Does not upgrade this session: sign in with a code for an MFA one. */
async function confirmMfa(ctx: ReqCtx<MfaConfirmRequest>) {
  const { deps, session } = ctx;
  const { u, refused } = await reauthenticate(ctx);
  if (refused !== null) return new Refuse(credentialError(refused));
  if (u.mfa_enrolled) throw new ApiError("MFA_ALREADY_ENROLLED");
  if (u.mfa_secret_enc === null) throw new ApiError("MFA_NOT_STARTED");
  if (!await consumeTotp(ctx.tx, deps, u, ctx.body.code)) {
    throw new ApiError("MFA_CODE_INVALID");
  }
  await ctx.tx.query("UPDATE users SET mfa_enrolled = true WHERE id = $1",
    [u.id]);
  await revokeOtherSessions(ctx.tx, u.id, session!.tokenHash, deps.now());
  securityLog(ctx, "mfa.enrolled");
  return meOf(ctx.tx, { ...u, mfa_enrolled: true }, session!);
}

export function registerAuthRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "health", async () => ({ status: "ok" }));
  register(app, deps, "signup", signup);
  register(app, deps, "login", (ctx: ReqCtx<LoginRequest>) =>
    login(ctx.enter, ctx.deps, ctx.body));
  register(app, deps, "logout", async (ctx) => {
    await expireSession(ctx.tx, ctx.session!.tokenHash, ctx.deps.now());
    return null;
  });
  register(app, deps, "getMe", (ctx) =>
    meOf(ctx.tx, ctx.user!, ctx.session!));
  register(app, deps, "enrolMfa", enrolMfa);
  register(app, deps, "confirmMfa", confirmMfa);
}
