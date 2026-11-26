-- Plan 13: email-in. One mailbox secret per company (hash to match,
-- sealed copy to show the address), settings, received items and
-- their attachments. Sender, subject and text are sealed; rejected
-- items keep only status, reason, auth results and time.

CREATE TABLE inbound_mailboxes (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  secret_hash text NOT NULL,
  secret_enc text NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  rotated_at timestamptz NOT NULL
);

CREATE TABLE inbound_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  version integer NOT NULL CHECK (version >= 1),
  body jsonb NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE inbound_items (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  status text NOT NULL CHECK (status IN ('received', 'accepted',
    'dismissed', 'rejected')),
  received_at timestamptz NOT NULL,
  message_id text NOT NULL,
  from_enc text,
  matched_employee_id uuid,
  content_enc text,
  auth jsonb NOT NULL,
  flags text[] NOT NULL DEFAULT '{}',
  reject_reason text,
  decided_by uuid,
  decided_at timestamptz,
  decision jsonb,
  UNIQUE (company_id, id)
);
CREATE INDEX inbound_items_list
  ON inbound_items (company_id, received_at DESC);

CREATE TABLE inbound_attachments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  item_id uuid NOT NULL,
  idx integer NOT NULL CHECK (idx >= 0),
  file_name text NOT NULL,
  content_type text,
  size integer NOT NULL,
  sha256 text,
  blob_key text,
  status text NOT NULL CHECK (status IN ('kept', 'skipped')),
  skip text,
  UNIQUE (item_id, idx),
  FOREIGN KEY (company_id, item_id)
    REFERENCES inbound_items (company_id, id),
  CHECK ((status = 'kept') = (blob_key IS NOT NULL))
);

ALTER TABLE inbound_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_mailboxes FORCE ROW LEVEL SECURITY;
ALTER TABLE inbound_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE inbound_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_items FORCE ROW LEVEL SECURITY;
ALTER TABLE inbound_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_attachments FORCE ROW LEVEL SECURITY;

CREATE POLICY inbound_mailboxes_tenant ON inbound_mailboxes
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY inbound_settings_tenant ON inbound_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY inbound_items_tenant ON inbound_items
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY inbound_attachments_tenant ON inbound_attachments
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON inbound_mailboxes, inbound_settings,
  inbound_items, inbound_attachments TO payroll_app;
