-- Plan 8 exit hooks: document and access-revocation runs (insert and
-- select only), and revocable memberships. A revoked membership is
-- treated as no membership by the tenant guard; a new invite restores
-- it. Access runs are one per exit and kind, so a repeat call reads
-- the stored result instead of calling the port again.

CREATE TABLE exit_hook_runs (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  exit_id uuid NOT NULL,
  -- 'access-confirm': HR confirmed a login (ref) is someone else's.
  hook text NOT NULL
    CHECK (hook IN ('documents', 'access', 'access-confirm')),
  kind text NOT NULL,
  status text NOT NULL,
  ref text,
  at timestamptz NOT NULL,
  FOREIGN KEY (company_id, exit_id) REFERENCES exits (company_id, id)
);
CREATE INDEX exit_hook_runs_exit ON exit_hook_runs (company_id, exit_id);
CREATE UNIQUE INDEX exit_hook_runs_access_once
  ON exit_hook_runs (company_id, exit_id, kind) WHERE hook = 'access';

ALTER TABLE exit_hook_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_hook_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY exit_hook_runs_tenant ON exit_hook_runs
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON exit_hook_runs TO payroll_app;

ALTER TABLE memberships ADD COLUMN revoked_at timestamptz;
ALTER TABLE memberships ADD COLUMN revoked_by uuid REFERENCES users (id);

-- "My companies" (no tenant set) shows only unrevoked memberships.
DROP POLICY companies_select ON companies;
CREATE POLICY companies_select ON companies FOR SELECT
  USING (id = app_company_id() OR (app_company_id() IS NULL AND id IN
    (SELECT m.company_id FROM memberships m
     WHERE m.user_id = app_user_id() AND m.revoked_at IS NULL)));

DROP POLICY memberships_select ON memberships;
CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (company_id = app_company_id()
    OR (app_company_id() IS NULL AND user_id = app_user_id()
      AND revoked_at IS NULL));
