-- Security review I2: a WhatsApp number verified by one person ends
-- every other person's opt-in on that number, in every company, and
-- voids their open or awaiting-reason actions. The caller's own
-- opt-ins (same user, other companies) are kept: same person.
--
-- It runs as the owner with app.company_id cleared while it works, so
-- the job-scan policies (1303, 1304) apply even inside a tenant
-- transaction. set_config is used and the old value restored before
-- returning: a function-level SET of the placeholder needs a
-- superuser.
CREATE FUNCTION replace_whatsapp_phone(p_hash text, p_user uuid,
  p_now timestamptz)
  RETURNS TABLE (company_id uuid, opt_in_id uuid, user_id uuid)
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  SET search_path FROM CURRENT
  AS $$
  DECLARE
    prev text := coalesce(current_setting('app.company_id', true), '');
  BEGIN
    PERFORM set_config('app.company_id', '', true);
    UPDATE channel_actions a SET status = 'void'
    WHERE a.phone_hash = p_hash AND a.recipient_user_id <> p_user
      AND a.status IN ('open', 'awaiting-reason');
    RETURN QUERY
      UPDATE channel_opt_ins o SET status = 'withdrawn',
        withdrawn_at = p_now, withdrawn_via = 'replaced'
      WHERE o.phone_hash = p_hash AND o.user_id <> p_user
        AND o.status <> 'withdrawn'
      RETURNING o.company_id, o.id, o.user_id;
    PERFORM set_config('app.company_id', prev, true);
  END
  $$;

REVOKE ALL ON FUNCTION replace_whatsapp_phone(text, uuid, timestamptz)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_whatsapp_phone(text, uuid, timestamptz)
  TO payroll_app;
