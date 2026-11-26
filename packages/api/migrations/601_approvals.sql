-- Plan 6: the shared approval spine. A chain per subject type holds
-- amount tiers; a request resolves them to steps at submit, with the
-- eligible user ids fixed then. A decided step and a closed request
-- never change again (triggers). No delete grant.

CREATE TABLE approval_chains (
  company_id uuid NOT NULL REFERENCES companies (id),
  subject_type text NOT NULL CHECK (subject_type IN ('expense-claim')),
  version integer NOT NULL CHECK (version >= 1),
  tiers jsonb NOT NULL,
  over_limit_approver text NOT NULL
    CHECK (over_limit_approver IN ('owner', 'hr')),
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, subject_type)
);

CREATE TABLE approval_requests (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  subject_type text NOT NULL CHECK (subject_type IN ('expense-claim')),
  subject_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN
    ('pending', 'approved', 'rejected', 'returned', 'cancelled')),
  current_step integer,
  submitted_by uuid NOT NULL,
  claimant_user_id uuid,
  claimant_employee_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  closed_at timestamptz,
  UNIQUE (company_id, id),
  CHECK ((status = 'pending') = (current_step IS NOT NULL)),
  CHECK ((status = 'pending') = (closed_at IS NULL))
);
-- At most one open request per subject.
CREATE UNIQUE INDEX approval_requests_one_open
  ON approval_requests (company_id, subject_type, subject_id)
  WHERE status = 'pending';

CREATE TABLE approval_steps (
  company_id uuid NOT NULL,
  request_id uuid NOT NULL,
  step_order integer NOT NULL CHECK (step_order BETWEEN 1 AND 6),
  approver jsonb NOT NULL,
  eligible uuid[] NOT NULL CHECK (cardinality(eligible) > 0),
  status text NOT NULL CHECK (status IN ('waiting', 'pending',
    'approved', 'rejected', 'returned', 'cancelled')),
  decided_by uuid,
  decided_at timestamptz,
  note text,
  PRIMARY KEY (request_id, step_order),
  FOREIGN KEY (company_id, request_id)
    REFERENCES approval_requests (company_id, id),
  -- A decider is always one of the step's eligible users.
  CHECK (decided_by IS NULL OR decided_by = ANY (eligible))
);
CREATE INDEX approval_steps_pending
  ON approval_steps (company_id, status);

CREATE FUNCTION approval_closed_is_final() RETURNS trigger
  LANGUAGE plpgsql SET search_path = pg_catalog
  AS $$
BEGIN
  IF OLD.status NOT IN ('pending', 'waiting') THEN
    RAISE EXCEPTION '% is %, not open', TG_TABLE_NAME, OLD.status;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER approval_requests_final
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION approval_closed_is_final();
CREATE TRIGGER approval_steps_final
  BEFORE UPDATE ON approval_steps
  FOR EACH ROW EXECUTE FUNCTION approval_closed_is_final();

ALTER TABLE approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_chains FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps FORCE ROW LEVEL SECURITY;

CREATE POLICY approval_chains_tenant ON approval_chains
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY approval_requests_tenant ON approval_requests
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY approval_steps_tenant ON approval_steps
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON approval_chains, approval_requests,
  approval_steps TO payroll_app;
