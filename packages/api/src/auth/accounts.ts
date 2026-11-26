import type { Membership, Role, User } from "@payroll/contract";
import type { Db } from "../db/db";

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  mfa_secret_enc: string | null;
  mfa_enrolled: boolean;
  failed_logins: number;
  locked_until: string | null;
}

export function toUser(r: UserRow): User {
  return { id: r.id, email: r.email, displayName: r.display_name,
    mfaEnrolled: r.mfa_enrolled };
}

export async function userByEmail(tx: Db, email: string) {
  const [row] = await tx.query<UserRow>(
    "SELECT * FROM users WHERE lower(email) = lower($1)", [email]);
  return row ?? null;
}

export async function userById(tx: Db, id: string) {
  const [row] = await tx.query<UserRow>(
    "SELECT * FROM users WHERE id = $1", [id]);
  return row ?? null;
}

export async function insertUser(tx: Db, u: { id: string; email: string;
  displayName: string; passwordHash: string; at: string }) {
  await tx.query(
    `INSERT INTO users (id, email, display_name, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [u.id, u.email, u.displayName, u.passwordHash, u.at]);
}

/** Needs app.user_id set to the user (see the companies policy). */
export async function membershipsOf(
  tx: Db,
  userId: string,
): Promise<Membership[]> {
  const rows = await tx.query<{ company_id: string; name: string;
    role: Role; employee_id: string | null }>(
    `SELECT m.company_id, c.name, m.role, m.employee_id
     FROM memberships m JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = $1 ORDER BY c.name, m.company_id`, [userId]);
  return rows.map((r) => ({ companyId: r.company_id, companyName: r.name,
    role: r.role, employeeId: r.employee_id }));
}

export async function insertMembership(tx: Db, m: { companyId: string;
  userId: string; role: Role; employeeId: string | null; at: string }) {
  await tx.query(
    `INSERT INTO memberships (company_id, user_id, role, employee_id,
       created_at) VALUES ($1, $2, $3, $4, $5)`,
    [m.companyId, m.userId, m.role, m.employeeId, m.at]);
}
