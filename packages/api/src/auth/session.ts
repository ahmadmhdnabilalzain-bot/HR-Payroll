import { sha256Hex } from "../audit/canonical";
import type { Db } from "../db/db";
import type { HandlerDeps as AppDeps } from "../deps";

/** Absolute lifetime from sign-in; no sliding renewal. */
export const SESSION_MS = 8 * 3600 * 1000;

/** How a request reached a handler (absent means the web app). */
export type Via = "web" | "whatsapp" | "email-in" | "job" | "api-key";

export interface Session {
  tokenHash: string;
  userId: string;
  mfa: boolean;
  expiresAt: string;
  via?: Via;
  /** "password", "sso:<provider>" or "api-key" (Tasks 7 and 9). */
  authMethod?: string;
}

/** 32 random bytes, base64url. Only the SHA-256 is ever stored. */
export function newSecret(deps: AppDeps): string {
  return Buffer.from(deps.randomBytes(32)).toString("base64url");
}

export const tokenHash = (token: string): string => sha256Hex(token);

export async function createSession(
  tx: Db,
  deps: AppDeps,
  userId: string,
  mfa: boolean,
  authMethod = "password",
): Promise<{ token: string; expiresAt: string }> {
  const token = newSecret(deps);
  const now = deps.now();
  const expiresAt = new Date(now.getTime() + SESSION_MS).toISOString();
  await tx.query(
    `INSERT INTO sessions (token_hash, user_id, mfa, expires_at, created_at,
       auth_method) VALUES ($1, $2, $3, $4, $5, $6)`,
    [tokenHash(token), userId, mfa, expiresAt, now.toISOString(),
      authMethod]);
  return { token, expiresAt };
}

/** The live session for a token, or null (unknown or expired). */
export async function findSession(
  tx: Db,
  token: string,
  now: Date,
): Promise<Session | null> {
  const [row] = await tx.query<{ user_id: string; mfa: boolean;
    expires_at: string; auth_method: string }>(
    `SELECT user_id, mfa, expires_at, auth_method FROM sessions
     WHERE token_hash = $1 AND expires_at > $2`,
    [tokenHash(token), now.toISOString()]);
  if (row === undefined) return null;
  return { tokenHash: tokenHash(token), userId: row.user_id, mfa: row.mfa,
    expiresAt: row.expires_at, authMethod: row.auth_method };
}

/** Logout: the row is expired, not deleted (the app role cannot delete). */
export async function expireSession(tx: Db, hash: string, now: Date) {
  await tx.query("UPDATE sessions SET expires_at = $2 WHERE token_hash = $1",
    [hash, now.toISOString()]);
}

/** Expires every live session of the user except `keepHash`. */
export async function revokeOtherSessions(tx: Db, userId: string,
  keepHash: string, now: Date): Promise<void> {
  await tx.query(
    `UPDATE sessions SET expires_at = $3 WHERE user_id = $1
     AND token_hash <> $2 AND expires_at > $3`,
    [userId, keepHash, now.toISOString()]);
}
