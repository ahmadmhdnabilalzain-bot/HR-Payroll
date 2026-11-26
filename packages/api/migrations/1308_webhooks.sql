-- Plan 13: outbound signed webhooks. Secrets are sealed; events are
-- thin (ids only); attempts never store a response body.

CREATE TABLE webhook_endpoints (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  url text NOT NULL,
  description text NOT NULL DEFAULT '',
  events text[] NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'paused')),
  paused_reason text,
  secret_enc text NOT NULL,
  prev_secret_enc text,
  prev_valid_until timestamptz,
  secret_last4 text NOT NULL,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  outcome text,
  created_at timestamptz NOT NULL
);

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  endpoint_id uuid NOT NULL,
  event_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded',
    'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  lease_until timestamptz,
  created_at timestamptz NOT NULL,
  finished_at timestamptz
);
CREATE INDEX webhook_deliveries_due
  ON webhook_deliveries (status, next_attempt_at);

CREATE TABLE webhook_attempts (
  company_id uuid NOT NULL REFERENCES companies (id),
  delivery_id uuid NOT NULL,
  n integer NOT NULL,
  at timestamptz NOT NULL,
  status_code integer,
  error text,
  duration_ms integer NOT NULL,
  PRIMARY KEY (delivery_id, n)
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_endpoints_tenant ON webhook_endpoints
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY webhook_events_tenant ON webhook_events
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY webhook_deliveries_tenant ON webhook_deliveries
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY webhook_attempts_tenant ON webhook_attempts
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON webhook_endpoints, webhook_events,
  webhook_deliveries, webhook_attempts TO payroll_app;

DO $$
BEGIN
  EXECUTE format('CREATE POLICY webhook_deliveries_job_scan
    ON webhook_deliveries FOR SELECT
    USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
END
$$;

CREATE FUNCTION due_webhook_deliveries(p_now timestamptz,
  p_limit integer)
  RETURNS TABLE (company_id uuid, delivery_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    SELECT d.company_id, d.id FROM webhook_deliveries d
    WHERE d.status = 'pending' AND d.next_attempt_at <= p_now
      AND (d.lease_until IS NULL OR d.lease_until < p_now)
    ORDER BY d.next_attempt_at, d.id
    LIMIT p_limit
  $$;
REVOKE ALL ON FUNCTION due_webhook_deliveries(timestamptz, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION due_webhook_deliveries(timestamptz, integer)
  TO payroll_app;
