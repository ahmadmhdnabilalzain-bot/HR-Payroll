import type { Db } from "../../src/db/db";
import { seedExpenseRows } from "./seed-rows-expenses";

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
  await seedTime(admin, c, rowId(c, "f1"));
  await seedPay(admin, c, rowId(c, "f1"));
}

async function seedPay(admin: Db, c: string, emp: string): Promise<void> {
  const run = rowId(c, "b1");
  await admin.query(
    `INSERT INTO pay_runs (id, company_id, year, month, status,
       idempotency_key, request_hash, input_hash, snapshot_enc, gross,
       employee_count, created_by, created_at)
     VALUES ($1, $2, 2026, 1, 'draft', 'seed', $3, $3, 'x', 0, 1, $4, $5)`,
    [run, c, H0, emp, AT]);
  await admin.query(
    `INSERT INTO payslips (id, company_id, pay_run_id, employee_id,
       body_enc, created_at) VALUES ($1, $2, $3, $4, 'x', $5)`,
    [rowId(c, "b2"), c, run, emp, AT]);
  await admin.query(
    `INSERT INTO sif_files (id, company_id, pay_run_id, file_name, total,
       text_enc, findings_enc, error_count, warning_count, created_by,
       created_at) VALUES ($1, $2, $3, 'seed.SIF', 0, 'x', 'x', 0, 0, $4,
       $5)`, [rowId(c, "b3"), c, run, emp, AT]);
}

async function seedTime(admin: Db, c: string, emp: string): Promise<void> {
  const lt = rowId(c, "a1");
  await admin.query(
    `INSERT INTO leave_types (id, company_id, name, paid, annual_days,
       created_at) VALUES ($1, $2, 'Annual', true, 30, $3)`, [lt, c, AT]);
  await admin.query(
    `INSERT INTO leave_requests (id, company_id, employee_id, leave_type_id,
       start_date, end_date, days, status, created_by, created_at)
     VALUES ($1, $2, $3, $4, '2026-03-02', '2026-03-03', 2, 'pending', $3,
       $5)`, [rowId(c, "a2"), c, emp, lt, AT]);
  await admin.query(
    `INSERT INTO leave_adjustments (id, company_id, employee_id,
       leave_type_id, year, days, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, 2026, 1, 'seed', $3, $5)`,
    [rowId(c, "a3"), c, emp, lt, AT]);
  await admin.query(
    `INSERT INTO attendance (id, company_id, employee_id, date, clock_in,
       source, created_at) VALUES ($1, $2, $3, '2026-03-01', $4, 'self',
       $4)`, [rowId(c, "a4"), c, emp, AT]);
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
  await seedExpenseRows(admin, c, rowId(c, "f1"), s.userId);
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
