-- Review M9: expired SSO states and old rate counters are purged by
-- `main.ts jobs`. payroll_app keeps no DELETE grant: the function runs
-- as the owner, and DELETE and SELECT policies keyed to the owner
-- (with no tenant set, which the function arranges) let it remove rate
-- counters (a DELETE with a WHERE clause needs SELECT visibility too).
DO $$
BEGIN
  EXECUTE format('CREATE POLICY rate_counters_job_purge ON rate_counters
    FOR DELETE USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
  EXECUTE format('CREATE POLICY rate_counters_job_scan ON rate_counters
    FOR SELECT USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
END
$$;

CREATE FUNCTION purge_channel_state(p_now timestamptz)
  RETURNS TABLE (states integer, counters integer)
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  SET search_path FROM CURRENT
  AS $$
  DECLARE
    prev text := coalesce(current_setting('app.company_id', true), '');
    s integer;
    r integer;
  BEGIN
    PERFORM set_config('app.company_id', '', true);
    -- States live 10 minutes; a day's grace keeps them for support.
    DELETE FROM sso_states WHERE expires_at < p_now - interval '1 day';
    GET DIAGNOSTICS s = ROW_COUNT;
    -- The longest window is one day; two days of counters are kept.
    DELETE FROM rate_counters
    WHERE window_start < extract(epoch FROM p_now)::bigint - 2 * 86400;
    GET DIAGNOSTICS r = ROW_COUNT;
    PERFORM set_config('app.company_id', prev, true);
    RETURN QUERY SELECT s, r;
  END
  $$;
REVOKE ALL ON FUNCTION purge_channel_state(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_channel_state(timestamptz) TO payroll_app;
