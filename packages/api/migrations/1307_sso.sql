-- Plan 13: OpenID Connect sign-in. sso_states and sso_identities are
-- keyed by user, not company: global tables (no RLS), like users and
-- sessions. Settings are per company. Sessions record how they began.

CREATE TABLE sso_states (
  state_hash text PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  intent text NOT NULL CHECK (intent IN ('login', 'invite', 'link')),
  user_id uuid REFERENCES users (id),
  invite_token_enc text,
  nonce text NOT NULL,
  code_verifier_enc text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE sso_identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  subject_key text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'linked'
    CHECK (status IN ('linked', 'unlinked')),
  linked_at timestamptz NOT NULL,
  last_used_at timestamptz,
  unlinked_at timestamptz
);
-- One live link per provider identity (unlinked rows are kept).
CREATE UNIQUE INDEX sso_identities_subject
  ON sso_identities (provider, subject_key) WHERE status = 'linked';

GRANT SELECT, INSERT, UPDATE ON sso_states, sso_identities TO payroll_app;

CREATE TABLE sso_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  version integer NOT NULL CHECK (version >= 1),
  body jsonb NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL
);
ALTER TABLE sso_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY sso_settings_tenant ON sso_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON sso_settings TO payroll_app;

ALTER TABLE sessions ADD COLUMN auth_method text NOT NULL
  DEFAULT 'password';
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Job scans for the owner-run JIT lookup (see 1303).
DO $$
BEGIN
  EXECUTE format('CREATE POLICY sso_settings_job_scan ON sso_settings
    FOR SELECT USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
  EXECUTE format('CREATE POLICY employees_job_scan ON employees
    FOR SELECT USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
  EXECUTE format('CREATE POLICY memberships_job_scan ON memberships
    FOR SELECT USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
END
$$;

-- Companies that turned on just-in-time employee accounts for this
-- domain and have an active, unlinked employee with this email.
CREATE FUNCTION sso_jit_candidates(p_email text, p_domain text)
  RETURNS TABLE (company_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    SELECT s.company_id FROM sso_settings s
    WHERE (s.body ->> 'jitEmployees')::boolean
      AND s.body -> 'allowedDomains' ? p_domain
      AND EXISTS (SELECT 1 FROM employees e
        WHERE e.company_id = s.company_id AND lower(e.email) = p_email
          AND (e.last_working_date IS NULL
            OR e.last_working_date >= current_date)
          AND NOT EXISTS (SELECT 1 FROM memberships m
            WHERE m.company_id = e.company_id AND m.employee_id = e.id))
  $$;
REVOKE ALL ON FUNCTION sso_jit_candidates(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sso_jit_candidates(text, text) TO payroll_app;
