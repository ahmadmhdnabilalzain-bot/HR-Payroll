import type { LoginRequest, LoginResponse, Me } from "@payroll/contract";
import type { Db } from "../db/db";
import { withTenant } from "../db/tenant";
import type { AppDeps } from "../deps";
import { ApiError } from "../http/errors";
import {
  membershipsOf,
  toUser,
  userByEmail,
  userById,
  type UserRow,
} from "./accounts";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import { base32Decode, verifyTotp } from "./totp";

/** Security policy (not statutory): 5 failures lock for 15 minutes. */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

type Outcome =
  | { kind: "ok"; userId: string; mfa: boolean }
  | { kind: "fail" }
  | { kind: "locked" };

const dummies = new Map<number, Promise<string>>();

/** A hash at the same cost, so unknown emails take as long as known. */
function dummyHash(deps: AppDeps): Promise<string> {
  const N = deps.passwordCost.N;
  if (!dummies.has(N)) {
    dummies.set(N, hashPassword("dummy password", deps.passwordCost,
      new Uint8Array(16)));
  }
  return dummies.get(N)!;
}

export const unixSeconds = (d: Date) => Math.floor(d.getTime() / 1000);

export function mfaSecret(deps: AppDeps, u: UserRow): Uint8Array | null {
  if (u.mfa_secret_enc === null) return null;
  return base32Decode(deps.keyring.decryptGlobal(
    `users:mfa_secret:${u.id}`, u.mfa_secret_enc));
}

function totpOk(deps: AppDeps, u: UserRow, code: string | undefined) {
  if (code === undefined) return true;
  const secret = u.mfa_enrolled ? mfaSecret(deps, u) : null;
  return secret !== null &&
    verifyTotp(secret, code, unixSeconds(deps.now()));
}

async function recordFailure(tx: Db, deps: AppDeps, u: UserRow) {
  const failed = u.failed_logins + 1;
  const lock = failed >= MAX_FAILED_LOGINS;
  const until = lock
    ? new Date(deps.now().getTime() + LOCK_MS).toISOString() : null;
  await tx.query(
    "UPDATE users SET failed_logins = $2, locked_until = $3 WHERE id = $1",
    [u.id, lock ? 0 : failed, until]);
}

async function check(tx: Db, deps: AppDeps, b: LoginRequest)
  : Promise<Outcome> {
  const u = await userByEmail(tx, b.email);
  if (u === null) {
    await verifyPassword(b.password, await dummyHash(deps));
    return { kind: "fail" };
  }
  if (u.locked_until !== null &&
    Date.parse(u.locked_until) > deps.now().getTime()) {
    return { kind: "locked" };
  }
  const ok = await verifyPassword(b.password, u.password_hash) &&
    totpOk(deps, u, b.totp);
  if (!ok) {
    await recordFailure(tx, deps, u);
    return { kind: "fail" };
  }
  await tx.query("UPDATE users SET failed_logins = 0, locked_until = NULL" +
    " WHERE id = $1", [u.id]);
  return { kind: "ok", userId: u.id, mfa: b.totp !== undefined };
}

/** Session, user and memberships. `tx` must have app.user_id set. */
export async function signedIn(tx: Db, deps: AppDeps, userId: string,
  mfa: boolean): Promise<LoginResponse> {
  const s = await createSession(tx, deps, userId, mfa);
  const user = await userById(tx, userId);
  return { token: s.token, expiresAt: s.expiresAt, user: toUser(user!),
    memberships: await membershipsOf(tx, userId) };
}

/**
 * Every password check (sign-in and accept-invite) goes through here.
 * The failure counter commits before the error is thrown, so the
 * lockout holds even though the response is 401.
 */
export async function verifyCredentials(deps: AppDeps, b: LoginRequest)
  : Promise<{ userId: string; mfa: boolean }> {
  const out = await withTenant(deps.db, { companyId: null, userId: null },
    (tx) => check(tx, deps, b));
  if (out.kind === "locked") throw new ApiError("ACCOUNT_LOCKED");
  if (out.kind === "fail") throw new ApiError("INVALID_CREDENTIALS");
  return out;
}

export async function login(deps: AppDeps, b: LoginRequest)
  : Promise<LoginResponse> {
  const out = await verifyCredentials(deps, b);
  return withTenant(deps.db, { companyId: null, userId: out.userId },
    (tx) => signedIn(tx, deps, out.userId, out.mfa));
}

export async function meOf(tx: Db, u: UserRow,
  session: { mfa: boolean; expiresAt: string }): Promise<Me> {
  return { user: toUser(u), memberships: await membershipsOf(tx, u.id),
    session: { mfa: session.mfa, expiresAt: session.expiresAt } };
}
