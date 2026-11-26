import type { Db } from "../../src/db/db";

const AT = "2026-03-01T08:00:00.000Z";

/** A uuid made from a 2-hex-digit slot and the company id. */
const rowId = (c: string, slot: string) => `${slot}${c.slice(2)}`;

/**
 * One row in every Plan 6 tenant table for company `c` (admin handle,
 * past RLS). `emp` is a seeded employee, `user` a seeded user.
 */
export async function seedExpenseRows(admin: Db, c: string, emp: string,
  user: string): Promise<void> {
  const req = rowId(c, "c2");
  await admin.query(
    `INSERT INTO approval_chains (company_id, subject_type, version, tiers,
       over_limit_approver, updated_by, updated_at)
     VALUES ($1, 'expense-claim', 1, '[]', 'owner', $2, $3)`, [c, user, AT]);
  await admin.query(
    `INSERT INTO approval_requests (id, company_id, subject_type,
       subject_id, status, current_step, submitted_by,
       claimant_employee_id, created_at)
     VALUES ($1, $2, 'expense-claim', $3, 'pending', 1, $4, $5, $6)`,
    [req, c, rowId(c, "c1"), user, emp, AT]);
  await admin.query(
    `INSERT INTO approval_steps (company_id, request_id, step_order,
       approver, eligible, status)
     VALUES ($1, $2, 1, '{"kind":"line-manager"}', ARRAY[$3::uuid],
       'pending')`, [c, req, user]);
}
