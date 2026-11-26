-- Leave types, requests and adjustments, and attendance. Leave days
-- are calendar days inclusive; leave years are calendar years.

CREATE TABLE leave_types (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL,
  name_ar text,
  paid boolean NOT NULL,
  annual_days integer CHECK (annual_days BETWEEN 0 AND 366),
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id)
);

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL CHECK (days >= 1),
  status text NOT NULL
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason text,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK (end_date >= start_date),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, leave_type_id)
    REFERENCES leave_types (company_id, id)
);
CREATE INDEX leave_requests_employee
  ON leave_requests (company_id, employee_id, start_date);

CREATE TABLE leave_adjustments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  year integer NOT NULL,
  days integer NOT NULL CHECK (days BETWEEN -366 AND 366),
  reason text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, leave_type_id)
    REFERENCES leave_types (company_id, id)
);

CREATE TABLE attendance (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  date date NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  minutes integer CHECK (minutes >= 0),
  source text NOT NULL CHECK (source IN ('self', 'hr')),
  note text,
  created_at timestamptz NOT NULL,
  CHECK (clock_out IS NULL OR clock_out >= clock_in),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
-- At most one open record per employee.
CREATE UNIQUE INDEX attendance_one_open
  ON attendance (company_id, employee_id) WHERE clock_out IS NULL;

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_adjustments FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance FORCE ROW LEVEL SECURITY;

CREATE POLICY leave_types_tenant ON leave_types
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY leave_requests_tenant ON leave_requests
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY leave_adjustments_tenant ON leave_adjustments
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY attendance_tenant ON attendance
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE
  ON leave_types, leave_requests, leave_adjustments, attendance
  TO payroll_app;
