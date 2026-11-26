-- Review M8: with two rejects waiting for a typed reason on one phone,
-- the reason must not silently go to the newer one. The function now
-- returns up to two rows so the caller can tell; same signature.
CREATE OR REPLACE FUNCTION find_awaiting_reason(p_hash text,
  p_now timestamptz)
  RETURNS TABLE (company_id uuid, action_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    SELECT a.company_id, a.id FROM channel_actions a
    WHERE a.phone_hash = p_hash AND a.status = 'awaiting-reason'
      AND a.reason_until > p_now
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 2
  $$;
