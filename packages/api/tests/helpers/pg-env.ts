import type { Db } from "../../src/db/db";
import { MIGRATIONS_DIR, migrate } from "../../src/db/migrate";
import { openPg } from "../../src/db/pg";
import type { DbPair } from "./test-db";

/**
 * Real PostgreSQL set up as production should be: `plan3_owner`
 * (CREATEROLE, not superuser) owns the schema and runs migrations;
 * `plan3_runtime` (no superuser, no BYPASSRLS, owns nothing) serves,
 * granted payroll_app WITH SET TRUE. `DATABASE_URL` is a superuser
 * used only to create roles and schemas and to seed past RLS.
 */
export const ADMIN_URL = process.env.DATABASE_URL;
const OWNER = "plan3_owner";
const RUNTIME = "plan3_runtime";
const opened: Db[] = [];
let n = 0;

function urlFor(user: string | null, schema: string): string {
  const u = new URL(ADMIN_URL!);
  if (user !== null) {
    u.username = user;
    u.password = "";
  }
  u.searchParams.set("options", `-csearch_path=${schema}`);
  return u.toString();
}

async function ensureRoles(admin: Db): Promise<void> {
  await admin.exec(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${OWNER}')
    THEN CREATE ROLE ${OWNER} LOGIN CREATEROLE NOSUPERUSER; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RUNTIME}')
    THEN CREATE ROLE ${RUNTIME} LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  END $$`);
  await admin.exec(`GRANT CREATE ON DATABASE ${await dbName(admin)}
    TO ${OWNER}`);
}

async function dbName(admin: Db): Promise<string> {
  const [r] = await admin.query<{ d: string }>(
    "SELECT current_database() AS d");
  return r!.d;
}

/** A fresh schema, migrated by the owner, with both handles. */
export async function freshPgPair(runtimeMax = 10): Promise<DbPair> {
  const schema = `t_${process.pid}_${n++}`;
  const root = await openPg(ADMIN_URL!, { max: 1 });
  await ensureRoles(root);
  await root.exec(`CREATE SCHEMA ${schema} AUTHORIZATION ${OWNER}`);
  await root.close();
  const owner = await openPg(urlFor(OWNER, schema), { max: 1 });
  await migrate(owner, MIGRATIONS_DIR);
  await owner.close();
  const admin = await openPg(urlFor(null, schema), { max: 2 });
  await admin.exec(
    `GRANT payroll_app TO ${RUNTIME} WITH INHERIT FALSE, SET TRUE`);
  const db = await openPg(urlFor(RUNTIME, schema), { max: runtimeMax });
  opened.push(admin, db);
  return { db, admin };
}

export async function closeAll(): Promise<void> {
  for (const d of opened.splice(0)) await d.close();
}
