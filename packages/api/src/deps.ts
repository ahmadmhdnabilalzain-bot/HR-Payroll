import { randomBytes as nodeRandomBytes, randomUUID } from "node:crypto";
import { keyringFromKey, type Keyring } from "./crypto/keyring";
import type { Db } from "./db/db";

/** One structured log line. Never a request or response body. */
export type Logger = (line: Record<string, unknown>) => void;

/** Everything with side effects, injected so tests control it. */
export interface AppDeps {
  db: Db;
  now: () => Date;
  newId: () => string;
  randomBytes: (n: number) => Uint8Array;
  keyring: Keyring;
  log: Logger;
  passwordCost: { N: number };
}

/** What handlers get: everything but the raw database. */
export type HandlerDeps = Omit<AppDeps, "db">;

/** scrypt N for production (memory 128 * N * r = 32 MiB). */
export const PRODUCTION_PASSWORD_COST = { N: 32768 };

/** The real clock, ids, randomness and stdout JSON log. */
export function systemDeps(db: Db, kek: Uint8Array): AppDeps {
  const randomBytes = (n: number) => new Uint8Array(nodeRandomBytes(n));
  return {
    db,
    now: () => new Date(),
    newId: () => randomUUID(),
    randomBytes,
    keyring: keyringFromKey(kek, randomBytes),
    log: (line) => process.stdout.write(`${JSON.stringify(line)}\n`),
    passwordCost: PRODUCTION_PASSWORD_COST,
  };
}
