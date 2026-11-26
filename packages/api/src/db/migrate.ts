import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CodedError } from "../coded-error";
import type { Db } from "./db";

export const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..",
  "migrations");

const NAME = /^\d{3}_[a-z0-9_]+\.sql$/;

function migrationFiles(dir: string): string[] {
  const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of sql) {
    if (!NAME.test(f)) {
      throw new CodedError("MIGRATION_NAME",
        "migration files are named NNN_name.sql", { file: f });
    }
  }
  return sql;
}

async function applied(db: Db): Promise<Set<string>> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now())`);
  const rows = await db.query<{ name: string }>(
    "SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

/** Applies new `NNN_*.sql` files in order, each in its own transaction. */
export async function migrate(db: Db, dir: string): Promise<string[]> {
  const files = migrationFiles(dir);
  const done = await applied(db);
  const now: string[] = [];
  for (const f of files.filter((x) => !done.has(x))) {
    const sql = readFileSync(join(dir, f), "utf8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("INSERT INTO schema_migrations (name) VALUES ($1)",
        [f]);
    });
    now.push(f);
  }
  return now;
}
