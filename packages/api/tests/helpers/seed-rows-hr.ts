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

async function seedHiring(admin: Db, c: string,
  user: string): Promise<string> {
  const req = rowId(c, "74");
  const cand = rowId(c, "75");
  const app = rowId(c, "76");
  await admin.query(
    `INSERT INTO requisitions (id, company_id, title, headcount, status,
       requested_by, created_at)
     VALUES ($1, $2, 'Clerk', 1, 'open', $3, $4)`, [req, c, user, AT]);
  await admin.query(
    `INSERT INTO candidates (id, company_id, full_name, source,
       created_at) VALUES ($1, $2, 'Seed Candidate', 'direct', $3)`,
    [cand, c, AT]);
  await admin.query(
    `INSERT INTO applications (id, company_id, requisition_id,
       candidate_id, stage, created_at)
     VALUES ($1, $2, $3, $4, 'offer', $5)`, [app, c, req, cand, AT]);
  await admin.query(
    `INSERT INTO application_stage_events (id, company_id,
       application_id, seq, stage, at, by_user_id)
     VALUES ($1, $2, $3, 1, 'applied', $4, $5)`,
    [rowId(c, "77"), c, app, AT, user]);
  await admin.query(
    `INSERT INTO scorecards (id, company_id, application_id,
       interviewer_user_id, criteria, recommendation, submitted_at)
     VALUES ($1, $2, $3, $4, '[]', 'yes', $5)`,
    [rowId(c, "78"), c, app, user, AT]);
  await admin.query(
    `INSERT INTO interviews (id, company_id, application_id, starts_at,
       ends_at, interviewer_user_ids, status, calendar_status, created_by,
       created_at) VALUES ($1, $2, $3, $4, $5, '[]', 'scheduled',
       'not-connected', $6, $4)`,
    [rowId(c, "79"), c, app, AT, "2026-03-01T09:00:00.000Z", user]);
  return app;
}

/** One row in every Plan 8 tenant table for company `c`. */
export async function seedHrRows(admin: Db, c: string, user: string,
  emp: string): Promise<void> {
  await seedTasks(admin, c, user, emp);
  const app = await seedHiring(admin, c, user);
  await admin.query(
    `INSERT INTO offers (id, company_id, application_id, job_title,
       start_date, salary_enc, probation_months, contract_notice_days,
       terms_trace, status, created_by, created_at)
     VALUES ($1, $2, $3, 'Clerk', '2026-04-01', 'x', 0, 1, '[]',
       'pending-approval', $4, $5)`, [rowId(c, "7a"), c, app, user, AT]);
  await seedOnboarding(admin, c, user, emp, rowId(c, "7a"));
  await admin.query(
    `INSERT INTO exits (id, company_id, employee_id, kind, status,
       notice_given_date, notice_days, last_working_date,
       settlement_due_date, in_probation, flags, notice_trace,
       requested_by, created_at)
     VALUES ($1, $2, $3, 'resignation', 'requested', '2026-03-01', 1,
       '2026-03-02', '2026-03-16', false, '{}', '[]', $4, $5)`,
    [rowId(c, "7c"), c, emp, user, AT]);
  await admin.query(
    `INSERT INTO exit_hook_runs (id, company_id, exit_id, hook, kind,
       status, at) VALUES ($1, $2, $3, 'documents',
       'experience-certificate', 'not-configured', $4)`,
    [rowId(c, "7d"), c, rowId(c, "7c"), AT]);
  await admin.query(
    `INSERT INTO goals (id, company_id, employee_id, title, status,
       created_by, created_at) VALUES ($1, $2, $3, 'Seed goal', 'active',
       $4, $5)`, [rowId(c, "7e"), c, emp, user, AT]);
  await admin.query(
    `INSERT INTO goal_check_ins (id, company_id, goal_id, seq,
       author_user_id, progress, at) VALUES ($1, $2, $3, 1, $4, 10, $5)`,
    [rowId(c, "7f"), c, rowId(c, "7e"), user, AT]);
}

async function seedOnboarding(admin: Db, c: string, user: string,
  emp: string, offer: string): Promise<void> {
  await admin.query(
    `INSERT INTO checklist_templates (company_id, kind, version, items,
       updated_by, updated_at) VALUES ($1, 'exit', 1, '[]', $2, $3)`,
    [c, user, AT]);
  await admin.query(
    `INSERT INTO employment_terms (company_id, employee_id,
       probation_months, contract_notice_days, trace, updated_by,
       updated_at) VALUES ($1, $2, 0, 1, '[]', $3, $4)`,
    [c, emp, user, AT]);
  await admin.query(
    `INSERT INTO offer_hires (company_id, offer_id, employee_id, flow_id,
       created_at) VALUES ($1, $2, $3, $4, $5)`,
    [c, offer, emp, rowId(c, "7b"), AT]);
  await admin.query(
    `INSERT INTO onboarding_flows (id, company_id, employee_id, offer_id,
       template_version, started_at) VALUES ($1, $2, $3, $4, 0, $5)`,
    [rowId(c, "7b"), c, emp, offer, AT]);
}
