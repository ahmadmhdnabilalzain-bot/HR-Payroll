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
  await admin.query(
    `INSERT INTO receipts (id, company_id, employee_id, uploaded_by,
       file_name, content_type, size, sha256, blob_key, suggestion,
       uploaded_at) VALUES ($1, $2, $3, $4, 'r.png', 'image/png', 1, $5,
       $6, '{"source":"none"}', $7)`,
    [rowId(c, "c3"), c, emp, user, "0".repeat(64),
      `${c}/receipts/${rowId(c, "c3")}`, AT]);
  await admin.query(
    `INSERT INTO expense_categories (id, company_id, code, name, kind,
       created_at) VALUES ($1, $2, 'meals', 'Meals', 'receipt', $3)`,
    [rowId(c, "c4"), c, AT]);
  await admin.query(
    `INSERT INTO expense_policies (company_id, version, body, updated_by,
       updated_at) VALUES ($1, 1, '{}', $2, $3)`, [c, user, AT]);
  await seedClaimRows(admin, c, emp, user);
}

async function seedClaimRows(admin: Db, c: string, emp: string,
  user: string): Promise<void> {
  const claim = rowId(c, "c1");
  const item = rowId(c, "c5");
  await admin.query(
    `INSERT INTO expense_claims (id, company_id, employee_id, title, status,
       revision, created_by, created_at, total, vat_total, flags)
     VALUES ($1, $2, $3, 'Seed', 'draft', 1, $4, $5, 0, 0, '[]')`,
    [claim, c, emp, user, AT]);
  await admin.query(
    `INSERT INTO expense_items (id, company_id, claim_id, revision, idx,
       kind, category_id, date, description, amount, vat_amount)
     VALUES ($1, $2, $3, 1, 0, 'receipt', $4, '2026-03-01', 'Seed', 0, 0)`,
    [item, c, claim, rowId(c, "c4")]);
  await admin.query(
    `INSERT INTO expense_item_receipts (company_id, item_id, receipt_id)
     VALUES ($1, $2, $3)`, [c, item, rowId(c, "c3")]);
}
