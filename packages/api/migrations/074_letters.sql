-- Plan 7: issued letters. Each pins its template version, keeps the
-- SHA-256 of the stored PDF and an encrypted copy of the merge values
-- (AAD "<companyId>:letters:merge:<letterId>"). Only the named
-- employee's acknowledgement time is ever set, once.

CREATE TABLE letters (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  kind text NOT NULL CHECK (kind IN ('salary-certificate', 'noc',
    'experience', 'offer', 'warning')),
  lang text NOT NULL CHECK (lang IN ('en', 'ar')),
  template_id uuid NOT NULL,
  template_version_id uuid NOT NULL,
  template_version integer NOT NULL CHECK (template_version >= 1),
  employee_id uuid,
  issued_by uuid NOT NULL,
  issued_at timestamptz NOT NULL,
  file_id uuid NOT NULL,
  file_name text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  uses_salary boolean NOT NULL,
  merge_enc text NOT NULL,
  acknowledged_at timestamptz,
  UNIQUE (company_id, id),
  UNIQUE (company_id, file_id),
  FOREIGN KEY (company_id, template_id)
    REFERENCES letter_templates (company_id, id),
  FOREIGN KEY (company_id, template_version_id)
    REFERENCES letter_template_versions (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, file_id) REFERENCES files (company_id, id)
);
CREATE INDEX letters_employee ON letters (company_id, employee_id);

CREATE FUNCTION letters_ack_once() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.acknowledged_at IS NOT NULL AND
     NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at THEN
    RAISE EXCEPTION 'a letter is acknowledged once';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER letters_ack_once BEFORE UPDATE ON letters
  FOR EACH ROW EXECUTE FUNCTION letters_ack_once();

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters FORCE ROW LEVEL SECURITY;

CREATE POLICY letters_tenant ON letters
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON letters TO payroll_app;
GRANT UPDATE (acknowledged_at) ON letters TO payroll_app;
