import { sha256Hex } from "../audit/canonical";
import type { SsoProvider } from "../channels/ports";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { pkcePair } from "./identity";

const STATE_MS = 10 * 60_000;
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64url");

export interface StateRow {
  state_hash: string;
  provider: SsoProvider;
  intent: "login" | "invite" | "link";
  user_id: string | null;
  invite_token_enc: string | null;
  nonce: string;
  code_verifier_enc: string;
}

/**
 * SSO starts per minute across the service (review M9; a product
 * default: the public start route has no caller identity, so a
 * per-address limit belongs in the gateway).
 */
export const SSO_STARTS_PER_MINUTE = 300;

async function startsLastMinute(tx: Db, now: Date): Promise<number> {
  // A state expires STATE_MS after it was made.
  const since = new Date(now.getTime() + STATE_MS - 60_000).toISOString();
  const [r] = await tx.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM sso_states WHERE expires_at > $1",
    [since]);
  return r?.n ?? 0;
}

/** State and nonce: 32 random bytes; only the state's hash is kept. */
export async function createState(tx: Db, deps: HandlerDeps,
  provider: SsoProvider, intent: StateRow["intent"],
  extra: { userId?: string; inviteToken?: string } = {}) {
  if (await startsLastMinute(tx, deps.now()) >= SSO_STARTS_PER_MINUTE) {
    throw new ApiError("RATE_LIMITED");
  }
  const state = b64(deps.randomBytes(32));
  const nonce = b64(deps.randomBytes(32));
  const pk = pkcePair(deps.randomBytes(32));
  const hash = sha256Hex(state);
  const expiresAt = new Date(deps.now().getTime() + STATE_MS).toISOString();
  await tx.query(
    `INSERT INTO sso_states (state_hash, provider, intent, user_id,
       invite_token_enc, nonce, code_verifier_enc, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [hash, provider, intent, extra.userId ?? null,
      extra.inviteToken === undefined ? null : deps.keyring.encryptGlobal(
        `sso_states:invite:${hash}`, extra.inviteToken), nonce,
      deps.keyring.encryptGlobal(`sso_states:verifier:${hash}`,
        pk.verifier), expiresAt]);
  return { state, nonce, challenge: pk.challenge, expiresAt };
}

/** Used once, unexpired, for this provider; else 400. */
export async function consumeState(tx: Db, deps: HandlerDeps,
  provider: SsoProvider, state: string): Promise<StateRow & {
    verifier: string; inviteToken: string | null }> {
  const now = deps.now().toISOString();
  const [r] = await tx.query<StateRow>(
    `UPDATE sso_states SET used_at = $2 WHERE state_hash = $1
       AND used_at IS NULL AND expires_at > $2 AND provider = $3
     RETURNING *`, [sha256Hex(state), now, provider]);
  if (r === undefined) throw new ApiError("SSO_STATE_INVALID");
  const h = r.state_hash;
  return { ...r, verifier: deps.keyring.decryptGlobal(
    `sso_states:verifier:${h}`, r.code_verifier_enc),
  inviteToken: r.invite_token_enc === null ? null : deps.keyring
    .decryptGlobal(`sso_states:invite:${h}`, r.invite_token_enc) };
}
