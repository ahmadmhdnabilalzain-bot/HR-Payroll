import type { Db } from "../../src/db/db";

const AT = "2026-03-01T08:00:00.000Z";

/** A uuid made from a 2-hex-digit slot and the company id. */
const rowId = (companyId: string, slot: string) =>
  `${slot}${companyId.slice(2)}`;

async function seedTasks(admin: Db, c: string, user: string,
  emp: string): Promise<void> {
  const task = rowId(c, "71");
  await admin.query(
    `INSERT INTO tasks (id, company_id, title, status, assignee_user_id,
       employee_id, source, created_by, created_at)
     VALUES ($1, $2, 'Seed task', 'open', $3, $4, 'manual', $3, $5)`,
    [task, c, user, emp, AT]);
  await admin.query(
    `INSERT INTO task_checklist_items (id, company_id, task_id, label,
       status, position) VALUES ($1, $2, $3, 'Item', 'active', 0)`,
    [rowId(c, "72"), c, task]);
  await admin.query(
    `INSERT INTO task_comments (id, company_id, task_id, author_user_id,
       body, created_at) VALUES ($1, $2, $3, $4, 'Seed', $5)`,
    [rowId(c, "73"), c, task, user, AT]);
}

/** One row in every Plan 8 tenant table for company `c`. */
export async function seedHrRows(admin: Db, c: string, user: string,
  emp: string): Promise<void> {
  await seedTasks(admin, c, user, emp);
}
