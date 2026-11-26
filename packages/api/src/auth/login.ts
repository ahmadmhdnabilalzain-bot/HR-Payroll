import type { LoginRequest, LoginResponse, Me } from "@payroll/contract";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { Enter } from "../http/context";
import { ApiError } from "../http/errors";
import { membershipsOf, toUser, userById, type UserRow } from "./accounts";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";
import { base32Decode, totpStep } from "./totp";

/** Security policy (not statutory): 5 failures lock for 15 minutes. */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export type PasswordOutcome = "ok" | "fail" | "locked";

const dummies = new Map<number, Promise<string>>();

/** A hash at the same cost, so unknown emails take as long as known. */
function dummyHash(deps: HandlerDeps): Promise<string> {
  const N = deps.passwordCost.N;
  if (!dummies.has(N)) {
    dummies.set(N, hashPassword("dummy password", deps.passwordCost,
      new Uint8Array(16)));
  }
  return dummies.get(N)!;
}

export const unixSeconds = (d: Date) => Math.floor(d.getTime() / 1000);

/**
 * Locks the user row, so one user's sign-in attempts (and password
 * checks) run one at a time and every failure is counted.
 */
export async function lockUser(tx: Db, by: { email?: string; id?: string })
  : Promise<UserRow | null> {
  const [row] = by.id !== undefined
    ? await tx.query<UserRow>("SELECT * FROM users WHERE id = $1 FOR UPDATE",
      [by.id])
    : await tx.query<UserRow>(
      "SELECT * FROM users WHERE lower(email) = lower($1) FOR UPDATE",
      [by.email]);
  return row ?? null;
}

async function recordFailure(tx: Db, deps: HandlerDeps, id: string) {
  const until = new Date(deps.now().getTime() + LOCK_MS).toISOString();
  await tx.query(
    `UPDATE users SET
       locked_until = CASE WHEN failed_logins + 1 >= $2 THEN $3::timestamptz
         ELSE locked_until END,
       failed_logins = CASE WHEN failed_logins + 1 >= $2 THEN 0
         ELSE failed_logins + 1 END
     WHERE id = $1`, [id, MAX_FAILED_LOGINS, until]);
}

/** Password check on a row locked by `lockUser`; failures counted. */
export async function passwordCheck(tx: Db, deps: HandlerDeps, u: UserRow,
  password: string): Promise<PasswordOutcome> {
  if (u.locked_until !== null &&
    Date.parse(u.locked_until) > deps.now().getTime()) {
    return "locked";
  }
  // An account made by SSO has no password: never a match.
  if (u.password_hash !== null &&
    await verifyPassword(password, u.password_hash)) return "ok";
  await recordFailure(tx, deps, u.id);
  return "fail";
}

export function mfaSecret(deps: HandlerDeps, u: UserRow): Uint8Array | null {
  if (u.mfa_secret_enc === null) return null;
  return base32Decode(deps.keyring.decryptGlobal(
    `users:mfa_secret:${u.id}`, u.mfa_secret_enc));
}

/**
 * Accepts a matching code once: one UPDATE claims its step only when
 * no equal or later step was used, so parallel requests cannot both
 * pass. False for a wrong, stale or reused code.
 */
export async function consumeTotp(tx: Db, deps: HandlerDeps, u: UserRow,
  code: string): Promise<boolean> {
  const secret = mfaSecret(deps, u);
  if (secret === null) return false;
  const step = totpStep(secret, code, unixSeconds(deps.now()));
  if (step === null) return false;
  const claimed = await tx.query(
    `UPDATE users SET mfa_last_step = $2 WHERE id = $1
     AND (mfa_last_step IS NULL OR mfa_last_step < $2) RETURNING id`,
    [u.id, step]);
  return claimed.length === 1;
}

type Outcome =
  | { kind: "ok"; userId: string; mfa: boolean }
  | { kind: "fail" }
  | { kind: "locked" };

async function check(tx: Db, deps: HandlerDeps, b: LoginRequest)
  : Promise<Outcome> {
  const u = await lockUser(tx, { email: b.email });
  // API key service users never sign in with a password.
  if (u === null || u.kind === "service") {
    await verifyPassword(b.password, await dummyHash(deps));
    return { kind: "fail" };
  }
  const pw = await passwordCheck(tx, deps, u, b.password);
  if (pw !== "ok") return { kind: pw };
  if (b.totp !== undefined &&
    !(u.mfa_enrolled && await consumeTotp(tx, deps, u, b.totp))) {
    await recordFailure(tx, deps, u.id);
    return { kind: "fail" };
  }
  await tx.query("UPDATE users SET failed_logins = 0, locked_until = NULL" +
    " WHERE id = $1", [u.id]);
  return { kind: "ok", userId: u.id, mfa: b.totp !== undefined };
}

export function credentialError(outcome: "fail" | "locked"): ApiError {
  return new ApiError(outcome === "locked" ? "ACCOUNT_LOCKED"
    : "INVALID_CREDENTIALS");
}

/**
 * Every sign-in password check goes through here. The failure counter
 * commits before the error is thrown, so the lockout holds even
 * though the response is 401.
 */
export async function verifyCredentials(enter: Enter, deps: HandlerDeps,
  b: LoginRequest): Promise<{ userId: string; mfa: boolean }> {
  const out = await enter({ companyId: null, userId: null },
    (tx) => check(tx, deps, b));
  if (out.kind !== "ok") throw credentialError(out.kind);
  return out;
}

/** Session, user and memberships. `tx` must have app.user_id set. */
export async function signedIn(tx: Db, deps: HandlerDeps, userId: string,
  mfa: boolean, authMethod = "password"): Promise<LoginResponse> {
  const s = await createSession(tx, deps, userId, mfa, authMethod);
  const user = await userById(tx, userId);
  return { token: s.token, expiresAt: s.expiresAt, user: toUser(user!),
    memberships: await membershipsOf(tx, userId) };
}

export async function login(enter: Enter, deps: HandlerDeps,
  b: LoginRequest): Promise<LoginResponse> {
  const out = await verifyCredentials(enter, deps, b);
  return enter({ companyId: null, userId: out.userId },
    (tx) => signedIn(tx, deps, out.userId, out.mfa));
}

export async function meOf(tx: Db, u: UserRow,
  session: { mfa: boolean; expiresAt: string }): Promise<Me> {
  return { user: toUser(u), memberships: await membershipsOf(tx, u.id),
    session: { mfa: session.mfa, expiresAt: session.expiresAt } };
}
