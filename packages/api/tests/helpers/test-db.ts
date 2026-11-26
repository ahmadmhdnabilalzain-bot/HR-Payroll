import type { Db } from "../../src/db/db";
import { MIGRATIONS_DIR, migrate } from "../../src/db/migrate";
import { clonePglite, openPglite } from "../../src/db/pglite";
import { seedBare, seedTenantRows } from "./seed-rows";

let template: Promise<Db> | null = null;

async function migratedTemplate(): Promise<Db> {
  const db = await openPglite();
  await migrate(db, MIGRATIONS_DIR);
  return db;
}

/** A fresh pglite database with every migration applied. */
export async function createTestDb(): Promise<Db> {
  template ??= migratedTemplate();
  return clonePglite(await template);
}

/**
 * The app's handle and an RLS-bypassing admin handle. On pglite both
 * are the same superuser connection; on real PostgreSQL `db` is the
 * non-superuser runtime role and `admin` a superuser.
 */
export interface DbPair {
  db: Db;
  admin: Db;
}

export const COMPANY_A = "00000000-0000-4000-8000-00000000000a";
export const COMPANY_B = "00000000-0000-4000-8000-00000000000b";
export const USER_A = "00000000-0000-4000-8000-0000000000aa";
export const USER_B = "00000000-0000-4000-8000-0000000000bb";
/** A member of both companies (owner of B, employee of A). */
export const USER_AB = "00000000-0000-4000-8000-0000000000ab";

/** Two companies with at least one row in every tenant table each. */
export async function seedTwoCompanies(admin: Db): Promise<void> {
  await seedTenantRows(admin, [
    { companyId: COMPANY_A, userId: USER_A, tag: "a" },
    { companyId: COMPANY_B, userId: USER_B, tag: "b" },
  ], USER_AB);
}

/** Two companies with only their owner users and memberships. */
export async function seedTwoBareCompanies(admin: Db): Promise<void> {
  await seedBare(admin, { companyId: COMPANY_A, userId: USER_A, tag: "a" });
  await seedBare(admin, { companyId: COMPANY_B, userId: USER_B, tag: "b" });
}

/** Every table in the current schema that is tenant-scoped. */
export async function tenantTables(db: Db): Promise<string[]> {
  const rows = await db.query<{ table_name: string }>(
    `SELECT DISTINCT table_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND column_name = 'company_id'
     ORDER BY table_name`);
  return ["companies", ...rows.map((r) => r.table_name)];
}
