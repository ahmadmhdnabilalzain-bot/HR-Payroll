import type { Db } from "../../src/db/db";

/** A uuid made from a 2-hex-digit slot and the company id. */
const rowId = (companyId: string, slot: string) =>
  `${slot}${companyId.slice(2)}`;

const AT = "2026-03-01T08:00:00.000Z";

/** One row per Plan 9 table (Task 3 onward) for one company. */
export async function seedTimeRows(admin: Db, c: string, emp: string)
  : Promise<void> {
  await admin.query(
    `INSERT INTO company_time_settings (company_id, rest_days, updated_at)
     VALUES ($1, '{wed}', $2)`, [c, AT]);
  await admin.query(
    `INSERT INTO holidays (id, company_id, date, name, kind, status)
     VALUES ($1, $2, '2026-03-20', 'Company Day A', 'company', 'active')`,
    [rowId(c, "91"), c]);
  await admin.query(
    `INSERT INTO special_periods (id, company_id, kind, name, start_date,
       end_date, status) VALUES ($1, $2, 'ramadan', 'Test period',
       '2026-02-18', '2026-03-19', 'active')`, [rowId(c, "92"), c]);
  await admin.query(
    `INSERT INTO work_sites (id, company_id, name, lat_e6, lng_e6,
       radius_m, status) VALUES ($1, $2, 'Site A', 1500000, 1500000, 200,
       'active')`, [rowId(c, "93"), c]);
  await admin.query(
    `INSERT INTO employee_time_profiles (company_id, employee_id, work_mode,
       geofence_mode, work_site_ids, wfh_tracked, shift_worker)
     VALUES ($1, $2, 'site', 'off', '{}', false, false)`, [c, emp]);
  await seedRosterRows(admin, c, emp);
}

async function seedRosterRows(admin: Db, c: string, emp: string) {
  const tpl = rowId(c, "94");
  await admin.query(
    `INSERT INTO shift_templates (id, company_id, name, start_min, end_min,
       break_minutes, status) VALUES ($1, $2, 'Shift A', 540, 1020, 60,
       'active')`, [tpl, c]);
  await admin.query(
    `INSERT INTO roster_entries (company_id, employee_id, date, draft_kind,
       draft_shift_template_id) VALUES ($1, $2, '2026-03-02', 'shift', $3)`,
    [c, emp, tpl]);
  await admin.query(
    `INSERT INTO swap_requests (id, company_id, requester_employee_id,
       date, peer_employee_id, peer_date, status, requester_version,
       peer_version, requested_by, created_at) VALUES ($1, $2, $3,
       '2026-03-02', $3, '2026-03-02', 'cancelled', 0, 0, $3, $4)`,
    [rowId(c, "95"), c, emp, AT]);
  await admin.query(
    `INSERT INTO attendance_corrections (id, company_id, employee_id, date,
       clock_in, reason, status, requested_by, created_at) VALUES ($1, $2,
       $3, '2026-03-02', $4, 'seed', 'cancelled', $3, $4)`,
    [rowId(c, "96"), c, emp, AT]);
  const sheet = rowId(c, "97");
  await admin.query(
    `INSERT INTO timesheets (id, company_id, employee_id, year, month,
       status, created_at) VALUES ($1, $2, $3, 2026, 1, 'draft', $4)`,
    [sheet, c, emp, AT]);
  await admin.query(
    `INSERT INTO overtime_decisions (company_id, timesheet_id, date,
       approved_minutes, approved_night_minutes, decided_by, decided_at)
     VALUES ($1, $2, '2026-01-05', 0, 0, $3, $4)`, [c, sheet, emp, AT]);
  await seedLeaveRows(admin, c, emp);
}

async function seedLeaveRows(admin: Db, c: string, emp: string) {
  const lt = rowId(c, "a1");
  await admin.query(
    `INSERT INTO leave_policies (company_id, leave_type_id, payroll_kind,
       accrual, joining_year_pro_rata, day_count, half_days,
       min_notice_days, allow_negative, updated_at) VALUES ($1, $2,
       'annual', 'upfront', false, 'calendar', false, 0, false, $3)`,
    [c, lt, AT]);
  await admin.query(
    `INSERT INTO leave_request_dates (company_id, request_id, date, halves,
       part) VALUES ($1, $2, '2026-03-02', 2, 'full')`, [c, rowId(c, "a2")]);
  await admin.query(
    `INSERT INTO leave_blackouts (id, company_id, name, from_date, to_date,
       leave_type_ids, mode, status) VALUES ($1, $2, 'Test period',
       '2026-12-01', '2026-12-02', '{}', 'warn', 'active')`,
    [rowId(c, "98"), c]);
  await admin.query(
    `INSERT INTO leave_carryovers (company_id, employee_id, leave_type_id,
       to_year, halves, created_at) VALUES ($1, $2, $3, 2026, 0, $4)`,
    [c, emp, lt, AT]);
  await admin.query(
    `INSERT INTO leave_carryover_runs (company_id, from_year, created_at)
     VALUES ($1, 2025, $2)`, [c, AT]);
  await seedWfhRows(admin, c, emp);
}

async function seedWfhRows(admin: Db, c: string, emp: string) {
  await admin.query(
    `INSERT INTO wfh_settings (company_id, enabled, retention_days,
       activity_categories, location_each_hour, max_tracked_minutes,
       impact_assessment_done, legal_review, notice_version, updated_at)
     VALUES ($1, false, 30, true, true, 960, true, 'not-reviewed', 1, $2)`,
    [c, AT]);
  await admin.query(
    `INSERT INTO wfh_notices (company_id, version, published_at, text_en,
       collects, retention_days, legal_review) VALUES ($1, 1, $2, 'seed',
       '{}', 30, 'not-reviewed')`, [c, AT]);
  await admin.query(
    `INSERT INTO wfh_consents (id, company_id, employee_id, notice_version,
       decision, at) VALUES ($1, $2, $3, 1, 'declined', $4)`,
    [rowId(c, "99"), c, emp, AT]);
  await admin.query(
    `INSERT INTO wfh_pauses (id, company_id, employee_id, attendance_id,
       started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $5)`,
    [rowId(c, "9a"), c, emp, rowId(c, "a4"), AT]);
}
