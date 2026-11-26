-- SIF files: one per approved pay run, never changed. The file text
-- (IBANs, labour person ids, amounts) and the findings (whose values
-- can quote those fields) are sealed with the company key.

CREATE TABLE sif_files (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  pay_run_id uuid NOT NULL,
  file_name text NOT NULL,
  total bigint NOT NULL CHECK (total >= 0),
  text_enc text NOT NULL,
  findings_enc text NOT NULL,
  error_count integer NOT NULL,
  warning_count integer NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, pay_run_id),
  FOREIGN KEY (company_id, pay_run_id) REFERENCES pay_runs (company_id, id)
);

ALTER TABLE sif_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE sif_files FORCE ROW LEVEL SECURITY;

CREATE POLICY sif_files_tenant ON sif_files
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON sif_files TO payroll_app;
