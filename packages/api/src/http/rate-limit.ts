import type { HandlerDeps } from "../deps";
import { ApiError } from "./errors";

/**
 * Fixed one-minute windows, in this process's memory (a restart or a
 * second process starts afresh; a shared store is later work). State
 * is kept per app, keyed by its keyring object.
 */
const WINDOW_MS = 60_000;
const state = new WeakMap<object, Map<string, { start: number;
  n: number }>>();

export interface Limit {
  name: string;
  perUser: number;
  perCompany: number;
}

function hit(m: Map<string, { start: number; n: number }>, key: string,
  now: number, max: number): number | null {
  const w = m.get(key);
  if (w === undefined || now - w.start >= WINDOW_MS) {
    m.set(key, { start: now, n: 1 });
    return null;
  }
  if (w.n >= max) return Math.ceil((w.start + WINDOW_MS - now) / 1000);
  w.n++;
  return null;
}

/** Counts one call; over a limit, 429 RATE_LIMITED with Retry-After. */
export function rateLimit(deps: HandlerDeps, companyId: string,
  userId: string, l: Limit): void {
  let m = state.get(deps.keyring);
  if (m === undefined) {
    m = new Map();
    state.set(deps.keyring, m);
  }
  const now = deps.now().getTime();
  const wait = hit(m, `${l.name}:u:${companyId}:${userId}`, now, l.perUser)
    ?? hit(m, `${l.name}:c:${companyId}`, now, l.perCompany);
  if (wait !== null) {
    const e = new ApiError("RATE_LIMITED");
    e.retryAfterSeconds = Math.max(1, wait);
    throw e;
  }
}
