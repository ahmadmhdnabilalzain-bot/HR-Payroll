-- Plan 13: API keys. Each key acts as its own service user (role hr,
-- no password, never an approver, never notified, not listed). Only
-- SHA-256 hashes of the 256-bit secrets are stored.

ALTER TABLE users ADD COLUMN kind text NOT NULL DEFAULT 'human'
  CHECK (kind IN ('human', 'service'));

CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  key_id text NOT NULL UNIQUE CHECK (key_id ~ '^[0-9a-f]{16}$'),
  name text NOT NULL,
  service_user_id uuid NOT NULL REFERENCES users (id),
  scopes text[] NOT NULL,
  rate_limit_per_minute integer NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  secret_hash text NOT NULL,
  prev_secret_hash text,
  prev_valid_until timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz,
  last_used_at timestamptz,
  rotated_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant ON api_keys
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON api_keys TO payroll_app;
