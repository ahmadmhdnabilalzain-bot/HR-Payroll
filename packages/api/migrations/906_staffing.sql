-- Plan 9: a staffing minimum per department. It warns on leave
-- requests and in availability; it never refuses leave.

CREATE TABLE department_staffing (
  company_id uuid NOT NULL REFERENCES companies (id),
  department_id uuid PRIMARY KEY,
  min_on_duty integer CHECK (min_on_duty BETWEEN 0 AND 500),
  updated_at timestamptz NOT NULL,
  FOREIGN KEY (company_id, department_id)
    REFERENCES departments (company_id, id)
);

ALTER TABLE department_staffing ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_staffing FORCE ROW LEVEL SECURITY;
CREATE POLICY department_staffing_tenant ON department_staffing
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON department_staffing TO payroll_app;
