-- Money review fixes (2026-11-26): payslips go only into draft runs,
-- and the creator of a run can never be its approver, even through
-- direct SQL as the app role.

CREATE FUNCTION payslips_into_draft_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = pg_catalog
  AS $$
DECLARE
  run_status text;
BEGIN
  -- The schema is per deployment (and per test case), so qualify it.
  EXECUTE format(
    'SELECT status FROM %I.pay_runs WHERE company_id = $1 AND id = $2',
    TG_TABLE_SCHEMA)
    INTO run_status USING NEW.company_id, NEW.pay_run_id;
  IF run_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'payslips go only into draft pay runs (run is %)',
      coalesce(run_status, 'missing');
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER payslips_into_draft_only
  BEFORE INSERT ON payslips
  FOR EACH ROW EXECUTE FUNCTION payslips_into_draft_only();

ALTER TABLE pay_runs ADD CONSTRAINT pay_runs_sod
  CHECK (approved_by IS NULL OR approved_by <> created_by);
