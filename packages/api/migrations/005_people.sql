-- Departments and employees. Salary, IBAN, labour person id and
-- Emirates ID are stored encrypted with the company's data key (AAD
-- "<companyId>:employees:<column>:<employeeId>"); only the IBAN's
-- last four digits and the routing code are kept in clear.

CREATE TABLE departments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL,
  name_ar text,
  head_employee_id uuid,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id)
);

CREATE TABLE employees (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  number text NOT NULL,
  full_name text NOT NULL,
  full_name_ar text,
  email text,
  department_id uuid,
  manager_id uuid,
  job_title text NOT NULL,
  nationality text NOT NULL,
  worker_class text NOT NULL CHECK (worker_class IN
    ('expat-full-time', 'uae-national', 'gcc-national')),
  joining_date date NOT NULL,
  last_working_date date,
  labour_person_id_enc text,
  emirates_id_enc text,
  salary_enc text,
  salary_version integer NOT NULL DEFAULT 0,
  bank_routing text,
  iban_enc text,
  iban_last4 text,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, number),
  UNIQUE (company_id, id),
  -- References carry company_id, so they never cross companies.
  FOREIGN KEY (company_id, department_id)
    REFERENCES departments (company_id, id),
  FOREIGN KEY (company_id, manager_id)
    REFERENCES employees (company_id, id)
);

ALTER TABLE departments ADD FOREIGN KEY (company_id, head_employee_id)
  REFERENCES employees (company_id, id);
ALTER TABLE memberships ADD FOREIGN KEY (company_id, employee_id)
  REFERENCES employees (company_id, id);
ALTER TABLE invites ADD FOREIGN KEY (company_id, employee_id)
  REFERENCES employees (company_id, id);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments FORCE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;

CREATE POLICY departments_tenant ON departments
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY employees_tenant ON employees
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON departments, employees TO payroll_app;
