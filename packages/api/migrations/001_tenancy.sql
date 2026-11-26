-- Tenancy baseline: the app role, companies, users, sessions,
-- memberships and invites, with row-level security on tenant tables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payroll_app')
  THEN
    CREATE ROLE payroll_app NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

-- Empty setting means "no tenant": NULL never equals a column value.
CREATE FUNCTION app_company_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.company_id', true), '')::uuid $$;

CREATE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE TABLE companies (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  name_ar text,
  wps_employer_id text,
  wps_bank_routing text,
  dek_wrapped text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  mfa_secret_enc text,
  mfa_enrolled boolean NOT NULL DEFAULT false,
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

-- Only the SHA-256 of a session token is stored. Logout expires the row.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id),
  mfa boolean NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE memberships (
  company_id uuid NOT NULL REFERENCES companies (id),
  user_id uuid NOT NULL REFERENCES users (id),
  role text NOT NULL
    CHECK (role IN ('owner', 'hr', 'manager', 'employee')),
  employee_id uuid,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE invites (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  role text NOT NULL
    CHECK (role IN ('owner', 'hr', 'manager', 'employee')),
  employee_id uuid,
  created_by uuid NOT NULL REFERENCES users (id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites FORCE ROW LEVEL SECURITY;

-- A company is visible as the current tenant, or (read only) when the
-- current user is a member, so a user can list their companies.
CREATE POLICY companies_select ON companies FOR SELECT
  USING (id = app_company_id() OR id IN
    (SELECT m.company_id FROM memberships m
     WHERE m.user_id = app_user_id()));
CREATE POLICY companies_insert ON companies FOR INSERT
  WITH CHECK (id = app_company_id());
CREATE POLICY companies_update ON companies FOR UPDATE
  USING (id = app_company_id()) WITH CHECK (id = app_company_id());

CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (company_id = app_company_id() OR user_id = app_user_id());
CREATE POLICY memberships_insert ON memberships FOR INSERT
  WITH CHECK (company_id = app_company_id());
CREATE POLICY memberships_update ON memberships FOR UPDATE
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

CREATE POLICY invites_tenant ON invites
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

-- No DELETE is granted anywhere.
GRANT SELECT, INSERT, UPDATE ON companies, memberships, invites
  TO payroll_app;
GRANT SELECT, INSERT, UPDATE ON users, sessions TO payroll_app;
