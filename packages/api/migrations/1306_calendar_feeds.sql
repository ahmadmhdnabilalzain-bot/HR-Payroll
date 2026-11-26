-- Plan 13: secret-URL calendar feeds. Only the SHA-256 of a feed's
-- secret is stored; the URL is shown once.

CREATE TABLE calendar_feeds (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  user_id uuid NOT NULL REFERENCES users (id),
  scope text NOT NULL
    CHECK (scope IN ('my', 'team', 'company-deadlines')),
  secret_hash text NOT NULL,
  url_hint text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_fetched_at timestamptz
);
CREATE INDEX calendar_feeds_user
  ON calendar_feeds (company_id, user_id, status);

ALTER TABLE calendar_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_feeds FORCE ROW LEVEL SECURITY;
CREATE POLICY calendar_feeds_tenant ON calendar_feeds
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON calendar_feeds TO payroll_app;
