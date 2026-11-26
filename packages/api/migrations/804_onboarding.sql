-- Plan 8 onboarding: checklist templates (one per kind per company,
-- versioned), employment terms (engine dates as computed), the hire
-- claim row (one per offer: the idempotency key of "hire") and
-- onboarding flows.

CREATE TABLE checklist_templates (
  company_id uuid NOT NULL REFERENCES companies (id),
  kind text NOT NULL CHECK (kind IN ('onboarding', 'exit')),
  version integer NOT NULL CHECK (version > 0),
  items jsonb NOT NULL,
  updated_by uuid NOT NULL REFERENCES users (id),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, kind)
);

CREATE TABLE employment_terms (
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  probation_months integer NOT NULL CHECK (probation_months >= 0),
  probation_end_date date,
  employer_notice_deadline date,
  contract_notice_days integer NOT NULL CHECK (contract_notice_days > 0),
  trace jsonb NOT NULL,
  updated_by uuid NOT NULL REFERENCES users (id),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, employee_id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

-- The employee is created after the claim, in the same transaction.
CREATE TABLE offer_hires (
  company_id uuid NOT NULL REFERENCES companies (id),
  offer_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  flow_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, offer_id),
  FOREIGN KEY (company_id, offer_id) REFERENCES offers (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE onboarding_flows (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  offer_id uuid NOT NULL,
  template_version integer NOT NULL,
  started_at timestamptz NOT NULL,
  UNIQUE (company_id, offer_id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, offer_id) REFERENCES offers (company_id, id)
);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE employment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_terms FORCE ROW LEVEL SECURITY;
ALTER TABLE offer_hires ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_hires FORCE ROW LEVEL SECURITY;
ALTER TABLE onboarding_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_flows FORCE ROW LEVEL SECURITY;

CREATE POLICY checklist_templates_tenant ON checklist_templates
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY employment_terms_tenant ON employment_terms
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY offer_hires_tenant ON offer_hires
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY onboarding_flows_tenant ON onboarding_flows
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON checklist_templates, employment_terms
  TO payroll_app;
GRANT SELECT, INSERT ON offer_hires, onboarding_flows TO payroll_app;
