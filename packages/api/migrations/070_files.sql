-- Plan 7: uploaded files. The bytes are encrypted with the company key
-- (AAD "<companyId>:files:blob:<fileId>") and kept in the blob store
-- under blob_key; only metadata is here. A file is claimed once by the
-- record it belongs to (attached_to, "<kind>:<id>"); nothing else on
-- a row ever changes, and rows are never deleted.

CREATE TABLE files (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  mime text NOT NULL CHECK (mime IN
    ('application/pdf', 'image/png', 'image/jpeg')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  blob_key text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL,
  attached_to text CHECK (attached_to ~ '^[a-z-]+:[0-9a-f-]{36}$'),
  UNIQUE (company_id, id),
  CHECK (blob_key = company_id::text || '/files/' || id::text)
);

CREATE FUNCTION files_attach_once() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.attached_to IS NOT NULL OR NEW.attached_to IS NULL OR
     (to_jsonb(NEW) - 'attached_to') <> (to_jsonb(OLD) - 'attached_to')
  THEN
    RAISE EXCEPTION 'files.attached_to is write-once';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER files_attach_once BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION files_attach_once();

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;

CREATE POLICY files_tenant ON files
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON files TO payroll_app;
GRANT UPDATE (attached_to) ON files TO payroll_app;
