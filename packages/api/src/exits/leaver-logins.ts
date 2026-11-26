import type { LeaverLogin, Role } from "@payroll/contract";
import type { Db } from "../db/db";

/**
 * Logins of this company that may be the leaver's (Plan 8 review
 * C-1): memberships linked to the employee record, plus memberships
 * whose user email equals the employee's email (case-insensitive).
 * Revoked ones are listed as inactive; `confirmedOther` marks logins
 * HR confirmed belong to someone else on this exit.
 */
export async function leaverLogins(tx: Db, companyId: string,
  x: { id: string; employeeId: string }): Promise<LeaverLogin[]> {
  const rows = await tx.query<{ user_id: string; role: Role;
    linked: boolean; active: boolean; other: boolean }>(
    `SELECT m.user_id, m.role,
       coalesce(m.employee_id = $2, false) AS linked,
       m.revoked_at IS NULL AS active,
       EXISTS (SELECT 1 FROM exit_hook_runs r WHERE r.company_id = $1
         AND r.exit_id = $3 AND r.hook = 'access-confirm'
         AND r.ref = m.user_id::text) AS other
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1 AND (m.employee_id = $2 OR lower(u.email) =
       (SELECT lower(e.email) FROM employees e WHERE e.company_id = $1
         AND e.id = $2))
     ORDER BY m.user_id`, [companyId, x.employeeId, x.id]);
  return rows.map((r) => ({ userId: r.user_id, role: r.role,
    match: r.linked ? "linked" : "email", active: r.active,
    confirmedOther: r.other }));
}

/** Active logins of the leaver that HR has not confirmed as others. */
export function stillActive(ls: LeaverLogin[]): LeaverLogin[] {
  return ls.filter((l) => l.active && !l.confirmedOther);
}
