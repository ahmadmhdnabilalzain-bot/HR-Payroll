-- Plan 13: one-time WhatsApp approval actions. Each sent approval
-- message gets one row; its signed tokens name the row. A row is used
-- once, bound to the recipient's verified phone (keyed hash) and to
-- one approval step.

CREATE TABLE channel_actions (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  approval_id uuid NOT NULL,
  step_order integer NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES users (id),
  phone_hash text NOT NULL,
  delivery_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'used',
    'awaiting-reason', 'expired', 'void')),
  expires_at timestamptz NOT NULL,
  reason_until timestamptz,
  created_at timestamptz NOT NULL,
  decided_at timestamptz,
  decided_message_id text,
  FOREIGN KEY (company_id, approval_id)
    REFERENCES approval_requests (company_id, id)
);
CREATE INDEX channel_actions_phone ON channel_actions (phone_hash, status);
CREATE INDEX channel_actions_delivery
  ON channel_actions (company_id, delivery_id);

ALTER TABLE channel_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY channel_actions_tenant ON channel_actions
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON channel_actions TO payroll_app;

-- The job scan for the owner-run functions below (see 1303).
DO $$
BEGIN
  EXECUTE format('CREATE POLICY channel_actions_job_scan
    ON channel_actions
    USING (app_company_id() IS NULL AND current_user = %L)
    WITH CHECK (app_company_id() IS NULL AND current_user = %L)',
    current_user, current_user);
END
$$;

-- The newest action of this phone waiting for a typed reject reason.
CREATE FUNCTION find_awaiting_reason(p_hash text, p_now timestamptz)
  RETURNS TABLE (company_id uuid, action_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    SELECT a.company_id, a.id FROM channel_actions a
    WHERE a.phone_hash = p_hash AND a.status = 'awaiting-reason'
      AND a.reason_until > p_now
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 1
  $$;

-- STOP: the phone's actions waiting for a reason expire everywhere.
CREATE FUNCTION expire_awaiting_by_phone(p_hash text)
  RETURNS integer
  LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    WITH x AS (
      UPDATE channel_actions SET status = 'expired'
      WHERE phone_hash = p_hash AND status = 'awaiting-reason'
      RETURNING 1)
    SELECT count(*)::integer FROM x
  $$;

REVOKE ALL ON FUNCTION find_awaiting_reason(text, timestamptz),
  expire_awaiting_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_awaiting_reason(text, timestamptz),
  expire_awaiting_by_phone(text) TO payroll_app;
