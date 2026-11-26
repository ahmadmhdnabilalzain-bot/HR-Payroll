-- Plan 6: receipt files. The bytes are encrypted with the company key
-- (AAD "<companyId>:receipts:content:<receiptId>") and kept in the
-- blob store under blob_key; only metadata is here. Receipts are
-- insert-only.

CREATE TABLE receipts (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN
    ('image/jpeg', 'image/png', 'application/pdf')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 5242880),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  blob_key text NOT NULL UNIQUE,
  suggestion jsonb NOT NULL,
  uploaded_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE INDEX receipts_sha256 ON receipts (company_id, sha256);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY receipts_tenant ON receipts
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON receipts TO payroll_app;
