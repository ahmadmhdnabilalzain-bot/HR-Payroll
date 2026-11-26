-- Plan 8 goals and check-ins: simple records, no ratings or pay
-- fields. Check-ins are append only (insert and select).

CREATE TABLE goals (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  measure text,
  target text,
  due_date date,
  status text NOT NULL CHECK (status IN ('active', 'achieved', 'dropped')),
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

CREATE TABLE goal_check_ins (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  goal_id uuid NOT NULL,
  seq integer NOT NULL,
  author_user_id uuid NOT NULL REFERENCES users (id),
  progress integer NOT NULL CHECK (progress BETWEEN 0 AND 100),
  note text,
  at timestamptz NOT NULL,
  UNIQUE (company_id, goal_id, seq),
  FOREIGN KEY (company_id, goal_id) REFERENCES goals (company_id, id)
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;
ALTER TABLE goal_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_check_ins FORCE ROW LEVEL SECURITY;

CREATE POLICY goals_tenant ON goals
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY goal_check_ins_tenant ON goal_check_ins
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON goals TO payroll_app;
GRANT SELECT, INSERT ON goal_check_ins TO payroll_app;
