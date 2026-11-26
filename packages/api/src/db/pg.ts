import pg from "pg";
import { isoTimestamp, type Db } from "./db";

/** Production driver. Type parsers per pool, not global. */
const OID = { INT8: 20, DATE: 1082, TIMESTAMPTZ: 1184 } as const;

const typeOverrides = {
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (oid === OID.INT8) return (v: string) => BigInt(v);
    if (oid === OID.DATE) return (v: string) => v;
    if (oid === OID.TIMESTAMPTZ) return (v: string) => isoTimestamp(v);
    return pg.types.getTypeParser(oid, format ?? "text");
  },
} as pg.CustomTypesConfig;

type Client = pg.Pool | pg.PoolClient;

function clientDb(c: pg.PoolClient): Db {
  const db: Db = {
    query: async <T>(sql: string, params?: unknown[]) =>
      (await c.query(sql, params)).rows as T[],
    exec: async (sql) => {
      await c.query(sql);
    },
    transaction: (fn) => fn(db),
    close: async () => {
      throw new Error("close() inside a transaction");
    },
  };
  return db;
}

/**
 * Runs `fn` on one checked-out client with an "error" listener for as
 * long as it is out (see inTransaction); a client that failed is
 * destroyed, not returned to the pool.
 */
async function withClient<T>(pool: pg.Pool,
  fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  let broken: Error | undefined;
  const onError = (e: Error) => {
    broken ??= e;
  };
  c.on("error", onError);
  try {
    return await fn(c);
  } catch (err) {
    broken ??= isConnectionError(err) ? err as Error : undefined;
    throw err;
  } finally {
    c.removeListener("error", onError);
    c.release(broken);
  }
}

/** A failure that leaves the connection unusable. */
const isConnectionError = (e: unknown) => {
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" && (code.startsWith("08") ||
    code === "57P01" || code === "57P05");
};

async function inTransaction<T>(
  pool: pg.Pool,
  fn: (tx: Db) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  let broken: Error | undefined;
  // pg-pool listens for errors only on idle clients. A checked-out
  // client whose session the server ends (idle-in-transaction timeout,
  // admin kill, network loss) emits "error"; with no listener that is
  // an uncaught exception and kills the process. Record it instead:
  // the pending query rejects, the request fails cleanly, and the
  // client is destroyed on release.
  const onError = (e: Error) => {
    broken ??= e;
  };
  c.on("error", onError);
  try {
    await c.query("BEGIN");
    const out = await fn(clientDb(c));
    await c.query("COMMIT");
    return out;
  } catch (err) {
    // A failing ROLLBACK (broken connection) must not hide the
    // original error, and that client must not go back to the pool.
    try {
      await c.query("ROLLBACK");
    } catch (rollbackErr) {
      broken = rollbackErr as Error;
    }
    throw err;
  } finally {
    c.removeListener("error", onError);
    c.release(broken);
  }
}

/**
 * The API's own pool (`runtime: true`) cuts a statement after 30 s and
 * a transaction left idle after 15 s, so a stalled request cannot hold
 * a connection. Migrations and jobs run without these limits.
 */
export interface RuntimeLimits {
  statementMs: number;
  idleInTransactionMs: number;
}

export const RUNTIME_LIMITS: RuntimeLimits = { statementMs: 30_000,
  idleInTransactionMs: 15_000 };

export interface PgOptions {
  max?: number;
  /** The API's pool: statement and idle-transaction limits. */
  runtime?: boolean;
  /** Override the runtime limits (tests use short ones). */
  limits?: RuntimeLimits;
  /** Told when an idle pooled client fails (never with secrets). */
  onIdleError?: (line: Record<string, unknown>) => void;
}

function limitsOf(o: PgOptions) {
  if (o.runtime !== true) return {};
  const l = o.limits ?? RUNTIME_LIMITS;
  return { statement_timeout: l.statementMs,
    idle_in_transaction_session_timeout: l.idleInTransactionMs };
}

export async function openPg(url: string, opts: PgOptions = {})
  : Promise<Db> {
  // isoTimestamp converts any session time zone offset to UTC.
  const pool = new pg.Pool({ connectionString: url, types: typeOverrides,
    max: opts.max ?? 10, ...limitsOf(opts) });
  // An idle client's error (server restart, kill) must not crash the
  // process either; pg-pool drops that client itself.
  pool.on("error", (e) => opts.onIdleError?.({ level: "error",
    event: "db.idle-client-error", code: (e as { code?: unknown }).code
      ?? null }));
  // Pool-level queries go through withClient too, so they have the
  // same error listener as transactions.
  const run = (_c: Client, sql: string, params?: unknown[]) =>
    withClient(pool, (c) => c.query(sql, params));
  await run(pool, "SELECT 1");
  return {
    query: async <T>(sql: string, params?: unknown[]) =>
      (await run(pool, sql, params)).rows as T[],
    exec: async (sql) => {
      await run(pool, sql);
    },
    transaction: (fn) => inTransaction(pool, fn),
    close: () => pool.end(),
  };
}
