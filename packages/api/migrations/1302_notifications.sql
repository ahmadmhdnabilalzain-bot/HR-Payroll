-- Plan 13: in-app notifications, per-user preferences and the delivery
-- outbox (email and WhatsApp). The rendered message lives only in
-- payload_enc (company DEK); the log shows statuses, never text.

CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  user_id uuid NOT NULL REFERENCES users (id),
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link jsonb,
  created_at timestamptz NOT NULL,
  read_at timestamptz
);
CREATE INDEX notifications_inbox
  ON notifications (company_id, user_id, created_at DESC);

CREATE TABLE notification_prefs (
  company_id uuid NOT NULL REFERENCES companies (id),
  user_id uuid NOT NULL REFERENCES users (id),
  body jsonb NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE notification_deliveries (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  notification_id uuid,
  user_id uuid NOT NULL REFERENCES users (id),
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  kind text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'held', 'sending',
    'sent', 'failed', 'skipped', 'not-configured')),
  reason text,
  attempts integer NOT NULL DEFAULT 0,
  not_before timestamptz,
  lease_until timestamptz,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider text,
  provider_message_id text,
  language_fallback boolean NOT NULL DEFAULT false,
  payload_enc text,
  fallback_of uuid,
  created_at timestamptz NOT NULL
);
CREATE INDEX notification_deliveries_due
  ON notification_deliveries (status, not_before);
CREATE INDEX notification_deliveries_log
  ON notification_deliveries (company_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_tenant ON notifications
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY notification_prefs_tenant ON notification_prefs
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY notification_deliveries_tenant ON notification_deliveries
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON notifications, notification_prefs,
  notification_deliveries TO payroll_app;
