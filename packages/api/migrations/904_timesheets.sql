-- Plan 9: monthly timesheets (frozen at submit) and overtime
-- decisions. Pay inputs are built from these; nothing here writes
-- pay-run tables, and no work-from-home table is read.

CREATE TABLE timesheets (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'approved')),
  days_json jsonb,
  source_hash text,
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, employee_id, year, month),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

CREATE TABLE overtime_decisions (
  company_id uuid NOT NULL REFERENCES companies (id),
  timesheet_id uuid NOT NULL,
  date date NOT NULL,
  approved_minutes integer NOT NULL CHECK (approved_minutes >= 0),
  approved_night_minutes integer NOT NULL
    CHECK (approved_night_minutes >= 0),
  rest_day_approved boolean,
  compensation text CHECK (compensation IN ('pay', 'day-off')),
  decided_by uuid NOT NULL,
  decided_at timestamptz NOT NULL,
  -- Set when the decision no longer fits the day (reopen, reject, or
  -- a submit whose frozen day is smaller). No deletes (Ruling 20).
  voided_at timestamptz,
  PRIMARY KEY (timesheet_id, date),
  FOREIGN KEY (company_id, timesheet_id)
    REFERENCES timesheets (company_id, id)
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets FORCE ROW LEVEL SECURITY;
ALTER TABLE overtime_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY timesheets_tenant ON timesheets
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY overtime_decisions_tenant ON overtime_decisions
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON timesheets, overtime_decisions
  TO payroll_app;
