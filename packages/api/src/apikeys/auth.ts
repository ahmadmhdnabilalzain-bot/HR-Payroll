import { timingSafeEqual } from "node:crypto";
import { API_KEY_SCOPES, type RouteDef } from "@payroll/contract";
import { userById, type UserRow } from "../auth/accounts";
import type { Session } from "../auth/session";
import { consumeRate } from "../channels/rate";
import type { Db } from "../db/db";
import { UUID } from "../db/tenant";
import type { HandlerDeps } from "../deps";
import type { Enter } from "../http/context";
import { ApiError } from "../http/errors";
import { hashKeySecret, parseApiKey } from "./format";

export interface KeyAuth {
  user: UserRow;
  session: Session;
  companyId: string;
  scopes: string[];
  rate: { limit: number; remaining: number; resetAt: Date;
    allowed: boolean };
}

interface KeyRow {
  key_id: string; service_user_id: string; scopes: string[];
  rate_limit_per_minute: number; status: string; secret_hash: string;
  prev_secret_hash: string | null; prev_valid_until: string | null;
  expires_at: string | null; last_used_at: string | null;
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The key row when the secret matches a live secret, else null. */
async function liveKey(tx: Db, c: string, bearer: string, now: Date)
  : Promise<KeyRow | null> {
  const p = parseApiKey(bearer);
  if (p === null) return null;
  const [k] = await tx.query<KeyRow>(
    `SELECT key_id, service_user_id, array_to_json(scopes) AS scopes,
       rate_limit_per_minute, status, secret_hash, prev_secret_hash,
       prev_valid_until, expires_at, last_used_at FROM api_keys
     WHERE company_id = $1 AND key_id = $2`, [c, p.keyId]);
  if (k === undefined || k.status !== "active") return null;
  if (k.expires_at !== null && new Date(k.expires_at) <= now) return null;
  // Review M4: the service user's membership must still be live.
  const m = await tx.query(
    `SELECT 1 FROM memberships WHERE company_id = $1 AND user_id = $2
       AND revoked_at IS NULL`, [c, k.service_user_id]);
  if (m.length === 0) return null;
  const h = hashKeySecret(p.secret);
  const prevOk = k.prev_secret_hash !== null && k.prev_valid_until !== null &&
    now < new Date(k.prev_valid_until) && same(h, k.prev_secret_hash);
  return same(h, k.secret_hash) || prevOk ? k : null;
}

function routeAllowed(def: RouteDef): string {
  const scope = API_KEY_SCOPES[def.id];
  if (def.auth !== "tenant" || def.mfa || scope === undefined) {
    throw new ApiError("API_KEY_ROUTE_NOT_ALLOWED");
  }
  return scope;
}

/**
 * The key path of the guard: route allowed for keys, company header,
 * live secret (one 401 for every failure), scope, rate (its counter
 * commits even when the handler later fails).
 */
export async function authenticateApiKey(enter: Enter, deps: HandlerDeps,
  def: RouteDef, bearer: string, header: string | undefined)
  : Promise<KeyAuth> {
  const scope = routeAllowed(def);
  if (header === undefined || header === "") {
    throw new ApiError("COMPANY_HEADER_REQUIRED");
  }
  if (!UUID.test(header)) throw new ApiError("UNAUTHENTICATED");
  const c = header.toLowerCase();
  const now = deps.now();
  const out = await enter({ companyId: c, userId: null }, async (tx) => {
    const k = await liveKey(tx, c, bearer, now);
    if (k === null) return null;
    if (!k.scopes.includes(scope)) return { k, missing: true as const };
    const rate = await consumeRate(tx, c, "apikey", k.key_id,
      k.rate_limit_per_minute, 60, now);
    if (k.last_used_at === null ||
      now.getTime() - new Date(k.last_used_at).getTime() > 60_000) {
      await tx.query("UPDATE api_keys SET last_used_at = $3 WHERE " +
        "company_id = $1 AND key_id = $2", [c, k.key_id, now.toISOString()]);
    }
    return { k, rate, user: await userById(tx, k.service_user_id) };
  });
  if (out === null || ("user" in out && out.user === null)) {
    throw new ApiError("UNAUTHENTICATED");
  }
  if ("missing" in out) {
    throw new ApiError("SCOPE_MISSING", undefined, { scope });
  }
  return { user: out.user!, companyId: c, scopes: out.k.scopes,
    rate: { limit: out.k.rate_limit_per_minute, ...out.rate },
    session: { tokenHash: "", userId: out.user!.id, mfa: false,
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      via: "api-key", authMethod: "api-key" } };
}
