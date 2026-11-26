-- Plan 8 hiring: requisitions, candidates, applications, stage events,
-- scorecards and interviews. Stage events and scorecards are append
-- only (insert and select).

CREATE TABLE requisitions (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  title text NOT NULL,
  title_ar text,
  department_id uuid,
  hiring_manager_user_id uuid REFERENCES users (id),
  headcount integer NOT NULL CHECK (headcount > 0),
  hired_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pending-approval', 'open',
    'rejected', 'filled', 'cancelled')),
  reason text,
  requested_by uuid NOT NULL REFERENCES users (id),
  decided_by uuid REFERENCES users (id),
  decided_at timestamptz,
  decision_note text,
  close_reason text,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, department_id)
    REFERENCES departments (company_id, id)
);

CREATE TABLE candidates (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  full_name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL,
  source_detail text,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id)
);
CREATE UNIQUE INDEX candidates_email ON candidates (company_id, lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE applications (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  requisition_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('applied', 'screening',
    'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  UNIQUE (company_id, requisition_id, candidate_id),
  FOREIGN KEY (company_id, requisition_id)
    REFERENCES requisitions (company_id, id),
  FOREIGN KEY (company_id, candidate_id)
    REFERENCES candidates (company_id, id)
);

CREATE TABLE application_stage_events (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  application_id uuid NOT NULL,
  seq integer NOT NULL,
  stage text NOT NULL,
  at timestamptz NOT NULL,
  by_user_id uuid NOT NULL REFERENCES users (id),
  note text,
  UNIQUE (company_id, application_id, seq),
  FOREIGN KEY (company_id, application_id)
    REFERENCES applications (company_id, id)
);

CREATE TABLE scorecards (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  application_id uuid NOT NULL,
  interviewer_user_id uuid NOT NULL REFERENCES users (id),
  criteria jsonb NOT NULL,
  recommendation text NOT NULL,
  summary text,
  submitted_at timestamptz NOT NULL,
  UNIQUE (company_id, application_id, interviewer_user_id),
  FOREIGN KEY (company_id, application_id)
    REFERENCES applications (company_id, id)
);

CREATE TABLE interviews (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  application_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  interviewer_user_ids jsonb NOT NULL,
  location text,
  status text NOT NULL CHECK (status IN ('scheduled', 'cancelled')),
  calendar_status text NOT NULL
    CHECK (calendar_status IN ('not-connected', 'sent', 'failed')),
  calendar_ref text,
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL,
  CHECK (ends_at > starts_at),
  FOREIGN KEY (company_id, application_id)
    REFERENCES applications (company_id, id)
);

ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions FORCE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications FORCE ROW LEVEL SECURITY;
ALTER TABLE application_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards FORCE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews FORCE ROW LEVEL SECURITY;

CREATE POLICY requisitions_tenant ON requisitions
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY candidates_tenant ON candidates
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY applications_tenant ON applications
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY application_stage_events_tenant ON application_stage_events
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY scorecards_tenant ON scorecards
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY interviews_tenant ON interviews
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON requisitions, candidates, applications,
  interviews TO payroll_app;
GRANT SELECT, INSERT ON application_stage_events, scorecards
  TO payroll_app;
