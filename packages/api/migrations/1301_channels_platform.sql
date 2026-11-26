-- Plan 13: channel settings per company, fixed-window rate counters
-- and the provider message ids already seen (webhook retries).

CREATE TABLE channel_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  version integer NOT NULL CHECK (version >= 1),
  body jsonb NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE rate_counters (
  company_id uuid NOT NULL REFERENCES companies (id),
  scope text NOT NULL,
  key text NOT NULL,
  window_start bigint NOT NULL,
  count integer NOT NULL CHECK (count >= 1),
  PRIMARY KEY (company_id, scope, key, window_start)
);

CREATE TABLE inbound_seen (
  company_id uuid NOT NULL REFERENCES companies (id),
  provider text NOT NULL,
  message_id text NOT NULL CHECK (length(message_id) <= 500),
  seen_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, provider, message_id)
);

ALTER TABLE channel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_counters FORCE ROW LEVEL SECURITY;
ALTER TABLE inbound_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_seen FORCE ROW LEVEL SECURITY;

CREATE POLICY channel_settings_tenant ON channel_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY rate_counters_tenant ON rate_counters
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY inbound_seen_tenant ON inbound_seen
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON channel_settings, rate_counters,
  inbound_seen TO payroll_app;
