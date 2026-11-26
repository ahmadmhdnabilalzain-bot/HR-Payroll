-- Security review I4: SSO domains need ownership proof (a DNS TXT
-- record holding a random challenge) before just-in-time accounts or
-- enforcement use them, and a domain verified by one company cannot
-- be verified by another (the partial unique index holds across
-- tenants, whatever RLS lets a query see).
CREATE TABLE sso_domains (
  company_id uuid NOT NULL REFERENCES companies (id),
  domain text NOT NULL CHECK (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  token text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'verified')),
  created_at timestamptz NOT NULL,
  verified_at timestamptz,
  PRIMARY KEY (company_id, domain)
);
CREATE UNIQUE INDEX sso_domains_one_owner ON sso_domains (domain)
  WHERE status = 'verified';

ALTER TABLE sso_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_domains FORCE ROW LEVEL SECURITY;
CREATE POLICY sso_domains_tenant ON sso_domains
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON sso_domains TO payroll_app;

DO $$
BEGIN
  EXECUTE format('CREATE POLICY sso_domains_job_scan ON sso_domains
    FOR SELECT USING (app_company_id() IS NULL AND current_user = %L)',
    current_user);
END
$$;

-- Is the domain verified by another company? Callable from a tenant
-- transaction: app.company_id is cleared while it reads (see 1310).
CREATE FUNCTION sso_domain_taken(p_domain text, p_company uuid)
  RETURNS boolean
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path FROM CURRENT
  AS $$
  DECLARE
    prev text := coalesce(current_setting('app.company_id', true), '');
    taken boolean;
  BEGIN
    PERFORM set_config('app.company_id', '', true);
    SELECT EXISTS (SELECT 1 FROM sso_domains d WHERE d.domain = p_domain
      AND d.status = 'verified' AND d.company_id <> p_company) INTO taken;
    PERFORM set_config('app.company_id', prev, true);
    RETURN taken;
  END
  $$;
REVOKE ALL ON FUNCTION sso_domain_taken(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sso_domain_taken(text, uuid) TO payroll_app;

-- Just-in-time candidates now need the email domain verified by the
-- same company (replaces 1307's function, same signature).
CREATE OR REPLACE FUNCTION sso_jit_candidates(p_email text, p_domain text)
  RETURNS TABLE (company_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path FROM CURRENT
  AS $$
    SELECT s.company_id FROM sso_settings s
    WHERE (s.body ->> 'jitEmployees')::boolean
      AND s.body -> 'allowedDomains' ? p_domain
      AND EXISTS (SELECT 1 FROM sso_domains d
        WHERE d.company_id = s.company_id AND d.domain = p_domain
          AND d.status = 'verified')
      AND EXISTS (SELECT 1 FROM employees e
        WHERE e.company_id = s.company_id AND lower(e.email) = p_email
          AND (e.last_working_date IS NULL
            OR e.last_working_date >= current_date)
          AND NOT EXISTS (SELECT 1 FROM memberships m
            WHERE m.company_id = e.company_id AND m.employee_id = e.id))
  $$;
