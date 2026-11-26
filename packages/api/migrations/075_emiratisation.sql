-- Plan 7: Emiratisation inputs entered by HR (counting flags per
-- employee; null = not entered) and the company's settings (whether
-- it is in the 20-49 band's sectors, and its own values for the
-- unsourced params). Planning inputs only; no statutory number here.

CREATE TABLE emiratisation_flags (
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  skilled boolean,
  work_permit_valid boolean,
  paid_via_wps boolean,
  gpssa_registered boolean,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, employee_id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

CREATE TABLE emiratisation_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  sector_in_scope boolean,
  overrides jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

ALTER TABLE emiratisation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE emiratisation_flags FORCE ROW LEVEL SECURITY;
ALTER TABLE emiratisation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emiratisation_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY emiratisation_flags_tenant ON emiratisation_flags
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY emiratisation_settings_tenant ON emiratisation_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON emiratisation_flags,
  emiratisation_settings TO payroll_app;
