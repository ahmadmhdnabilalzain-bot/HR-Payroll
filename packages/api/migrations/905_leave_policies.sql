-- Plan 9: leave policies, half days (requests count half-days and
-- keep their counted dates), blackouts and the yearly carry-over.

CREATE TABLE leave_policies (
  company_id uuid NOT NULL REFERENCES companies (id),
  leave_type_id uuid PRIMARY KEY,
  payroll_kind text NOT NULL CHECK (payroll_kind IN
    ('annual', 'sick', 'maternity', 'unpaid', 'other-paid')),
  accrual text NOT NULL CHECK (accrual IN ('upfront', 'monthly')),
  joining_year_pro_rata boolean NOT NULL,
  day_count text NOT NULL CHECK (day_count IN ('calendar', 'working')),
  half_days boolean NOT NULL,
  carry_over_max_halves integer CHECK (carry_over_max_halves >= 0),
  carry_over_expires_months integer
    CHECK (carry_over_expires_months BETWEEN 1 AND 12),
  min_notice_days integer NOT NULL,
  max_consecutive_days integer,
  allow_negative boolean NOT NULL,
  updated_at timestamptz NOT NULL,
  FOREIGN KEY (company_id, leave_type_id)
    REFERENCES leave_types (company_id, id)
);

ALTER TABLE leave_requests
  ADD COLUMN start_part text NOT NULL DEFAULT 'full'
    CHECK (start_part IN ('full', 'am', 'pm')),
  ADD COLUMN end_part text NOT NULL DEFAULT 'full'
    CHECK (end_part IN ('full', 'am', 'pm')),
  ADD COLUMN half_units integer;
-- The owner role has no BYPASSRLS and RLS is forced on this table, so
-- the backfill would see no rows: lift FORCE for the data statements
-- only, and restore it below (review N1).
ALTER TABLE leave_requests NO FORCE ROW LEVEL SECURITY;
UPDATE leave_requests SET half_units = days * 2;
ALTER TABLE leave_requests ALTER COLUMN half_units SET NOT NULL;
ALTER TABLE leave_requests ADD CHECK (half_units >= 1);
ALTER TABLE leave_requests DROP COLUMN days;
ALTER TABLE leave_requests ADD UNIQUE (company_id, id);

CREATE TABLE leave_request_dates (
  company_id uuid NOT NULL REFERENCES companies (id),
  request_id uuid NOT NULL,
  date date NOT NULL,
  halves integer NOT NULL CHECK (halves IN (1, 2)),
  part text NOT NULL CHECK (part IN ('full', 'am', 'pm')),
  PRIMARY KEY (request_id, date),
  FOREIGN KEY (company_id, request_id)
    REFERENCES leave_requests (company_id, id)
);
-- Plan 3 requests were calendar days, full days.
INSERT INTO leave_request_dates (company_id, request_id, date, halves,
  part)
SELECT r.company_id, r.id, d::date, 2, 'full' FROM leave_requests r,
  generate_series(r.start_date, r.end_date, interval '1 day') AS d;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;

CREATE TABLE leave_blackouts (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  leave_type_ids uuid[] NOT NULL,
  department_id uuid,
  mode text NOT NULL CHECK (mode IN ('block', 'warn')),
  status text NOT NULL CHECK (status IN ('active', 'removed')),
  CHECK (to_date >= from_date)
);

CREATE TABLE leave_carryovers (
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  to_year integer NOT NULL,
  halves integer NOT NULL CHECK (halves >= 0),
  -- Above the cap: kept for HR (cash or agreement), never dropped.
  excess_halves integer NOT NULL DEFAULT 0 CHECK (excess_halves >= 0),
  expires_on date,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, employee_id, leave_type_id, to_year),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

CREATE TABLE leave_carryover_runs (
  company_id uuid NOT NULL REFERENCES companies (id),
  from_year integer NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, from_year)
);

ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_request_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_request_dates FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_blackouts FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_carryovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_carryovers FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_carryover_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_carryover_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY leave_policies_tenant ON leave_policies
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY leave_request_dates_tenant ON leave_request_dates
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY leave_blackouts_tenant ON leave_blackouts
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY leave_carryovers_tenant ON leave_carryovers
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY leave_carryover_runs_tenant ON leave_carryover_runs
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON leave_policies, leave_request_dates,
  leave_blackouts, leave_carryovers, leave_carryover_runs TO payroll_app;
