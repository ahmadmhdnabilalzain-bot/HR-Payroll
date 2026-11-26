-- Append-only, hash-chained audit log, one chain per company.

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies (id),
  seq bigint NOT NULL CHECK (seq >= 1),
  at timestamptz NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  data jsonb NOT NULL,
  prev_hash text NOT NULL,
  hash text NOT NULL,
  UNIQUE (company_id, seq)
);

CREATE TABLE audit_heads (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  seq bigint NOT NULL,
  hash text NOT NULL
);

CREATE FUNCTION audit_events_append_only() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END
$$;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_heads FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_events_tenant ON audit_events
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY audit_heads_tenant ON audit_heads
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON audit_events TO payroll_app;
GRANT SELECT, INSERT, UPDATE ON audit_heads TO payroll_app;
