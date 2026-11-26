import {
  PGlite,
  types,
  type PGliteInterface,
  type Transaction,
} from "@electric-sql/pglite";
import { isoTimestamp, type Db } from "./db";

/** Tests only: embedded PostgreSQL (WASM), in memory. */
const PARSERS = {
  [types.INT8]: (v: string) => BigInt(v),
  [types.DATE]: (v: string) => v,
  [types.TIMESTAMPTZ]: (v: string) => isoTimestamp(v),
};

type Queryable = Pick<Transaction, "query" | "exec">;

function txDb(tx: Queryable): Db {
  const db: Db = {
    query: async <T>(sql: string, params?: unknown[]) =>
      (await tx.query<T>(sql, params, { parsers: PARSERS })).rows,
    exec: async (sql) => {
      await tx.exec(sql);
    },
    transaction: (fn) => fn(db),
    close: async () => {
      throw new Error("close() inside a transaction");
    },
  };
  return db;
}

function wrap(pg: PGliteInterface): Db & { raw: PGliteInterface } {
  return {
    raw: pg,
    query: async <T>(sql: string, params?: unknown[]) =>
      (await pg.query<T>(sql, params, { parsers: PARSERS })).rows,
    exec: async (sql) => {
      await pg.exec(sql);
    },
    transaction: (fn) => pg.transaction((tx) => fn(txDb(tx))),
    close: () => pg.close(),
  };
}

export async function openPglite(): Promise<Db> {
  const pg = await PGlite.create({ parsers: PARSERS });
  return wrap(pg);
}

/** A copy of a pglite database (used to skip re-running migrations). */
export async function clonePglite(db: Db): Promise<Db> {
  const raw = (db as Db & { raw?: PGliteInterface }).raw;
  if (raw === undefined) throw new Error("not a pglite Db");
  return wrap(await raw.clone());
}
