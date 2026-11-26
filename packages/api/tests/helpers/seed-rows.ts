import type { Db } from "../../src/db/db";

const AT = "2026-03-01T08:00:00.000Z";
const H0 = "0".repeat(64);

export interface SeedCompany {
  companyId: string;
  userId: string;
  tag: string;
}

/** A uuid made from a 2-hex-digit slot and the company id. */
export function rowId(companyId: string, slot: string): string {
  return `${slot}${companyId.slice(2)}`;
}

async function insertUser(admin: Db, id: string, tag: string) {
  await admin.query(
    `INSERT INTO users (id, email, display_name, password_hash,
     created_at) VALUES ($1, $2, $3, 'x', $4)`,
    [id, `${tag}@example.com`, `User ${tag}`, AT]);
}

async function member(admin: Db, c: string, u: string, role: string) {
  await admin.query(
    `INSERT INTO memberships (company_id, user_id, role, created_at)
     VALUES ($1, $2, $3, $4)`, [c, u, role, AT]);
}

/** A company, its owner user and the owner membership only. */
export async function seedBare(admin: Db, s: SeedCompany): Promise<void> {
  await admin.query(
    `INSERT INTO companies (id, name, dek_wrapped, created_at)
     VALUES ($1, $2, 'x', $3)`, [s.companyId, `Company ${s.tag}`, AT]);
  await insertUser(admin, s.userId, s.tag);
  await member(admin, s.companyId, s.userId, "owner");
}

async function seedPeople(admin: Db, c: string): Promise<void> {
  await admin.query(
    `INSERT INTO departments (id, company_id, name, created_at)
     VALUES ($1, $2, 'Finance', $3)`, [rowId(c, "d1"), c, AT]);
  await admin.query(
    `INSERT INTO employees (id, company_id, number, full_name, job_title,
       nationality, worker_class, joining_date, created_at)
     VALUES ($1, $2, 'E-1', 'Seed Person', 'Clerk', 'IN',
       'expat-full-time', '2020-01-01', $3)`, [rowId(c, "f1"), c, AT]);
}

async function seedOne(admin: Db, s: SeedCompany): Promise<void> {
  const c = s.companyId;
  await seedBare(admin, s);
  await seedPeople(admin, c);
  await admin.query(
    `INSERT INTO invites (id, company_id, token_hash, email, role,
       created_by, expires_at) VALUES ($1, $2, $3, $4, 'hr', $5, $6)`,
    [rowId(c, "e1"), c, `hash-${s.tag}`, `inv-${s.tag}@example.com`,
      s.userId, AT]);
  await admin.query(
    `INSERT INTO audit_events (company_id, seq, at, action, entity_type,
       data, prev_hash, hash) VALUES ($1, 1, $2, 'company.created',
       'company', '{}', $3, $3)`, [c, AT, H0]);
  await admin.query(
    "INSERT INTO audit_heads (company_id, seq, hash) VALUES ($1, 1, $2)",
    [c, H0]);
}

/**
 * At least one row per tenant table for every company, inserted with
 * the RLS-bypassing admin handle. Later tasks add their tables here;
 * the tenancy suite fails while a tenant table has no seeded rows.
 */
export async function seedTenantRows(admin: Db, cs: SeedCompany[],
  both: string): Promise<void> {
  for (const s of cs) await seedOne(admin, s);
  await insertUser(admin, both, "both");
  const [first, second] = cs;
  await member(admin, first!.companyId, both, "employee");
  await member(admin, second!.companyId, both, "owner");
}
