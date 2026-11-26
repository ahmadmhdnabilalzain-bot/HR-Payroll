-- Plan 7: the company library. Documents are shared inside the tenant
-- with an audience; each version keeps its own read and acknowledge
-- receipts (a receipt, never a signature). Only the audience, a
-- receipt's two times (set once) and nothing else ever change.

CREATE TABLE library_documents (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  title_ar text CHECK (char_length(title_ar) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (category IN
    ('policy', 'handbook', 'form', 'notice', 'other')),
  audience jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id)
);

CREATE TABLE library_versions (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  document_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  file_id uuid NOT NULL,
  note text CHECK (char_length(note) BETWEEN 1 AND 500),
  requires_ack boolean NOT NULL,
  published_by uuid NOT NULL,
  published_at timestamptz NOT NULL,
  UNIQUE (document_id, version),
  UNIQUE (company_id, id),
  UNIQUE (company_id, file_id),
  FOREIGN KEY (company_id, document_id)
    REFERENCES library_documents (company_id, id),
  FOREIGN KEY (company_id, file_id) REFERENCES files (company_id, id)
);

CREATE TABLE library_receipts (
  company_id uuid NOT NULL REFERENCES companies (id),
  version_id uuid NOT NULL,
  user_id uuid NOT NULL,
  employee_id uuid,
  viewed_at timestamptz,
  acknowledged_at timestamptz,
  PRIMARY KEY (version_id, user_id),
  CHECK (acknowledged_at IS NULL OR viewed_at IS NOT NULL),
  FOREIGN KEY (company_id, version_id)
    REFERENCES library_versions (company_id, id)
);

CREATE FUNCTION library_receipt_set_once() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.viewed_at IS NOT NULL AND
      NEW.viewed_at IS DISTINCT FROM OLD.viewed_at) OR
     (OLD.acknowledged_at IS NOT NULL AND
      NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at) THEN
    RAISE EXCEPTION 'library receipt times are set once';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER library_receipt_set_once BEFORE UPDATE ON library_receipts
  FOR EACH ROW EXECUTE FUNCTION library_receipt_set_once();

ALTER TABLE library_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE library_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE library_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY library_documents_tenant ON library_documents
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY library_versions_tenant ON library_versions
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY library_receipts_tenant ON library_receipts
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON library_documents, library_versions,
  library_receipts TO payroll_app;
GRANT UPDATE (audience) ON library_documents TO payroll_app;
GRANT UPDATE (viewed_at, acknowledged_at) ON library_receipts
  TO payroll_app;
