-- Pay runs and payslips. The snapshot of inputs and every payslip body
-- are sealed with the company key; only the run's gross (integer fils),
-- input hash and counts are in clear. Approved and void runs are
-- immutable; payslips are never updated.

CREATE TABLE pay_runs (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  status text NOT NULL CHECK (status IN ('draft', 'approved', 'void')),
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  input_hash text NOT NULL,
  snapshot_enc text NOT NULL,
  gross bigint NOT NULL CHECK (gross >= 0),
  employee_count integer NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  voided_at timestamptz,
  UNIQUE (company_id, idempotency_key),
  UNIQUE (company_id, id)
);
-- One live run per company and month.
CREATE UNIQUE INDEX pay_runs_one_per_period
  ON pay_runs (company_id, year, month) WHERE status <> 'void';

CREATE FUNCTION pay_runs_draft_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path = pg_catalog
  AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'pay run % is %, not draft', OLD.id, OLD.status;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER pay_runs_draft_only
  BEFORE UPDATE ON pay_runs
  FOR EACH ROW EXECUTE FUNCTION pay_runs_draft_only();

CREATE TABLE payslips (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  pay_run_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  body_enc text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, pay_run_id, employee_id),
  FOREIGN KEY (company_id, pay_run_id) REFERENCES pay_runs (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

ALTER TABLE pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips FORCE ROW LEVEL SECURITY;

CREATE POLICY pay_runs_tenant ON pay_runs
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY payslips_tenant ON payslips
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON pay_runs TO payroll_app;
GRANT SELECT, INSERT ON payslips TO payroll_app;
