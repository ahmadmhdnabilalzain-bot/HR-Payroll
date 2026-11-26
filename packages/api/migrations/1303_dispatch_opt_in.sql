-- Plan 13: WhatsApp opt-ins (phone sealed, keyed hash for lookups),
-- verification codes (hash only), and two SECURITY DEFINER functions
-- for the jobs that work across companies.
--
-- Forced RLS applies to the table owner too (only a superuser or a
-- BYPASSRLS role skips it, and the owner role is neither in
-- production). So the cross-company functions run as the owner, and
-- each table they read gets a "job scan" policy that lets exactly
-- that role see rows while no tenant is set. payroll_app never
-- matches it: inside the functions current_user is the owner, outside
-- it is payroll_app.

CREATE TABLE channel_opt_ins (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  user_id uuid NOT NULL REFERENCES users (id),
  channel text NOT NULL CHECK (channel = 'whatsapp'),
  phone_enc text NOT NULL,
  phone_hash text NOT NULL,
  phone_last4 text NOT NULL CHECK (phone_last4 ~ '^[0-9]{4}$'),
  status text NOT NULL
    CHECK (status IN ('pending', 'active', 'withdrawn')),
  consent_version integer NOT NULL,
  consented_at timestamptz,
  verified_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_via text,
  created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX channel_opt_ins_one_live
  ON channel_opt_ins (company_id, user_id, channel)
  WHERE status <> 'withdrawn';
CREATE INDEX channel_opt_ins_phone ON channel_opt_ins (phone_hash);

CREATE TABLE channel_verify_codes (
  company_id uuid NOT NULL REFERENCES companies (id),
  opt_in_id uuid PRIMARY KEY REFERENCES channel_opt_ins (id),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used_at timestamptz
);

ALTER TABLE channel_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_opt_ins FORCE ROW LEVEL SECURITY;
ALTER TABLE channel_verify_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_verify_codes FORCE ROW LEVEL SECURITY;

CREATE POLICY channel_opt_ins_tenant ON channel_opt_ins
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY channel_verify_codes_tenant ON channel_verify_codes
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON channel_opt_ins, channel_verify_codes
  TO payroll_app;

-- The job-scan policies, keyed to the role running this migration
-- (the table owner).
DO $$
BEGIN
  EXECUTE format('CREATE POLICY notification_deliveries_job_scan
    ON notification_deliveries FOR SELECT
    USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
  EXECUTE format('CREATE POLICY channel_opt_ins_job_scan
    ON channel_opt_ins
    USING (app_company_id() IS NULL AND current_user = %L)
    WITH CHECK (app_company_id() IS NULL AND current_user = %L)',
    current_user, current_user);
END
$$;

-- Deliveries due now in any company: queued or held past not_before,
-- or sending with an expired lease. Ids only.
CREATE FUNCTION due_notification_deliveries(p_now timestamptz,
  p_limit integer)
  RETURNS TABLE (company_id uuid, delivery_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    SELECT d.company_id, d.id FROM notification_deliveries d
    WHERE (d.status IN ('queued', 'held')
        AND coalesce(d.not_before, '-infinity') <= p_now)
      OR (d.status = 'sending' AND d.lease_until < p_now)
    ORDER BY coalesce(d.not_before, d.created_at), d.id
    LIMIT p_limit
  $$;

-- STOP from a phone: withdraws that phone's opt-ins in every company.
CREATE FUNCTION withdraw_whatsapp_by_phone(p_hash text, p_now timestamptz)
  RETURNS integer
  LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    WITH w AS (
      UPDATE channel_opt_ins SET status = 'withdrawn',
        withdrawn_at = p_now, withdrawn_via = 'whatsapp-stop'
      WHERE phone_hash = p_hash AND status <> 'withdrawn'
      RETURNING 1)
    SELECT count(*)::integer FROM w
  $$;

REVOKE ALL ON FUNCTION due_notification_deliveries(timestamptz, integer),
  withdraw_whatsapp_by_phone(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  due_notification_deliveries(timestamptz, integer),
  withdraw_whatsapp_by_phone(text, timestamptz) TO payroll_app;
