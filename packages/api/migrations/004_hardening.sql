-- Security review fixes (2026-11-26): pinned search_path on policy
-- and trigger functions, cross-company rows only when no tenant is
-- set, no TRUNCATE of the audit log, schema usage for the app role.

ALTER FUNCTION app_company_id() SET search_path = pg_catalog;
ALTER FUNCTION app_user_id() SET search_path = pg_catalog;
ALTER FUNCTION audit_events_append_only() SET search_path = pg_catalog;

-- "My companies" (sign-in, /v1/me) is visible only with no tenant set;
-- inside a tenant, only that company's rows are.
DROP POLICY companies_select ON companies;
CREATE POLICY companies_select ON companies FOR SELECT
  USING (id = app_company_id() OR (app_company_id() IS NULL AND id IN
    (SELECT m.company_id FROM memberships m
     WHERE m.user_id = app_user_id())));

DROP POLICY memberships_select ON memberships;
CREATE POLICY memberships_select ON memberships FOR SELECT
  USING (company_id = app_company_id()
    OR (app_company_id() IS NULL AND user_id = app_user_id()));

-- Row triggers do not fire on TRUNCATE; this statement trigger does.
CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_append_only();

DO $$
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO payroll_app',
    current_schema());
END
$$;
