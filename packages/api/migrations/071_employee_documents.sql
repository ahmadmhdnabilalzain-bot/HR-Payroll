-- Plan 7: the employee document vault. One slot per statutory type per
-- employee ('other' may repeat); renewals are versions. The document
-- number is encrypted (AAD
-- "<companyId>:employee_document_versions:number:<versionId>").
-- Versions never change except the verification stamp; nothing is
-- deleted.

CREATE TABLE employee_documents (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('emirates-id', 'visa', 'passport',
    'labour-card', 'contract', 'other')),
  label text CHECK (char_length(label) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE UNIQUE INDEX employee_documents_one_slot
  ON employee_documents (company_id, employee_id, type)
  WHERE type <> 'other';

CREATE TABLE employee_document_versions (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  document_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  file_id uuid NOT NULL,
  number_enc text,
  issue_date date,
  expiry_date date CHECK (issue_date IS NULL OR expiry_date IS NULL OR
    expiry_date >= issue_date),
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL,
  verified_by uuid,
  verified_at timestamptz,
  UNIQUE (document_id, version),
  UNIQUE (company_id, file_id),
  CHECK ((verified_by IS NULL) = (verified_at IS NULL)),
  FOREIGN KEY (company_id, document_id)
    REFERENCES employee_documents (company_id, id),
  FOREIGN KEY (company_id, file_id) REFERENCES files (company_id, id)
);

CREATE TABLE document_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  lead_days jsonb NOT NULL,
  retention jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE employee_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE document_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY employee_documents_tenant ON employee_documents
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY employee_document_versions_tenant
  ON employee_document_versions
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY document_settings_tenant ON document_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON employee_documents, employee_document_versions
  TO payroll_app;
GRANT UPDATE (verified_by, verified_at) ON employee_document_versions
  TO payroll_app;
GRANT SELECT, INSERT, UPDATE ON document_settings TO payroll_app;
