-- Plan 8 offers. The salary is encrypted with the company's data key
-- (AAD "<companyId>:offers:salary_enc:<offerId>"). One live offer per
-- application (partial unique index). The terms (probation end date
-- and the engine trace) are stored as computed at creation.

CREATE TABLE offers (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  application_id uuid NOT NULL,
  job_title text NOT NULL,
  department_id uuid,
  manager_id uuid,
  start_date date NOT NULL,
  salary_enc text NOT NULL,
  probation_months integer NOT NULL CHECK (probation_months >= 0),
  probation_end_date date,
  contract_notice_days integer NOT NULL CHECK (contract_notice_days > 0),
  terms_trace jsonb NOT NULL,
  expires_on date,
  note text,
  status text NOT NULL CHECK (status IN ('pending-approval', 'approved',
    'rejected', 'accepted', 'declined', 'withdrawn', 'hired')),
  created_by uuid NOT NULL REFERENCES users (id),
  decided_by uuid REFERENCES users (id),
  decided_at timestamptz,
  decision_note text,
  responded_on date,
  employee_id uuid,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, application_id)
    REFERENCES applications (company_id, id),
  FOREIGN KEY (company_id, department_id)
    REFERENCES departments (company_id, id),
  FOREIGN KEY (company_id, manager_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE UNIQUE INDEX offers_one_live ON offers (company_id, application_id)
  WHERE status IN ('pending-approval', 'approved', 'accepted', 'hired');

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers FORCE ROW LEVEL SECURITY;
CREATE POLICY offers_tenant ON offers
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON offers TO payroll_app;
