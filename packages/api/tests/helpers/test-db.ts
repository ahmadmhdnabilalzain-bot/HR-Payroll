import type { Db } from "../../src/db/db";
import { MIGRATIONS_DIR, migrate } from "../../src/db/migrate";
import { clonePglite, openPglite } from "../../src/db/pglite";

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

export const COMPANY_A = "00000000-0000-4000-8000-00000000000a";
export const COMPANY_B = "00000000-0000-4000-8000-00000000000b";
export const USER_A = "00000000-0000-4000-8000-0000000000aa";
export const USER_B = "00000000-0000-4000-8000-0000000000bb";
const AT = "2026-03-01T08:00:00.000Z";

/** Two companies, one user each, inserted as the owner (superuser). */
export async function seedTwoCompanies(db: Db): Promise<void> {
  for (const [c, u, n] of [[COMPANY_A, USER_A, "a"],
    [COMPANY_B, USER_B, "b"]] as const) {
    await db.query(
      `INSERT INTO companies (id, name, dek_wrapped, created_at)
       VALUES ($1, $2, 'x', $3)`, [c, `Company ${n}`, AT]);
    await db.query(
      `INSERT INTO users (id, email, display_name, password_hash,
       created_at) VALUES ($1, $2, $3, 'x', $4)`,
      [u, `${n}@example.com`, `User ${n}`, AT]);
    await db.query(
      `INSERT INTO memberships (company_id, user_id, role, created_at)
       VALUES ($1, $2, 'owner', $3)`, [c, u, AT]);
  }
}

/** Every public table that is tenant-scoped (has company_id). */
export async function tenantTables(db: Db): Promise<string[]> {
  const rows = await db.query<{ table_name: string }>(
    `SELECT DISTINCT table_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND column_name = 'company_id'
     ORDER BY table_name`);
  return ["companies", ...rows.map((r) => r.table_name)];
}
