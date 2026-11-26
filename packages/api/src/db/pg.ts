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

async function inTransaction<T>(
  pool: pg.Pool,
  fn: (tx: Db) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(clientDb(c));
    await c.query("COMMIT");
    return out;
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  } finally {
    c.release();
  }
}

export async function openPg(url: string): Promise<Db> {
  // isoTimestamp converts any session time zone offset to UTC.
  const pool = new pg.Pool({ connectionString: url, types: typeOverrides });
  const run = (c: Client, sql: string, params?: unknown[]) =>
    c.query(sql, params);
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
