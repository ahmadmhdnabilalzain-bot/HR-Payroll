-- Plan 9: work-from-home settings, notices, consents and pauses.
-- There is no column for screenshots, screen video, keystrokes, page
-- contents, window titles, web addresses, camera or microphone, and
-- no setting that could turn any of them on. Retention has no default.

CREATE TABLE wfh_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  enabled boolean NOT NULL,
  retention_days integer CHECK (retention_days BETWEEN 1 AND 3650),
  activity_categories boolean NOT NULL,
  location_each_hour boolean NOT NULL,
  max_tracked_minutes integer NOT NULL
    CHECK (max_tracked_minutes BETWEEN 60 AND 1440),
  impact_assessment_done boolean NOT NULL,
  impact_assessment_date date,
  legal_review text NOT NULL
    CHECK (legal_review IN ('not-reviewed', 'reviewed-by-company-counsel')),
  notice_version integer,
  updated_at timestamptz NOT NULL
);

CREATE TABLE wfh_notices (
  company_id uuid NOT NULL REFERENCES companies (id),
  version integer NOT NULL,
  published_at timestamptz NOT NULL,
  text_en text NOT NULL,
  collects jsonb NOT NULL,
  retention_days integer NOT NULL,
  legal_review text NOT NULL,
  company_note text,
  PRIMARY KEY (company_id, version)
);

-- Append only: the latest row per employee is the current decision.
CREATE TABLE wfh_consents (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  notice_version integer NOT NULL,
  decision text NOT NULL
    CHECK (decision IN ('granted', 'declined', 'withdrawn')),
  at timestamptz NOT NULL,
  seq bigserial NOT NULL,
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE INDEX wfh_consents_employee
  ON wfh_consents (company_id, employee_id, seq);

CREATE TABLE wfh_pauses (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  attendance_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  CHECK (ended_at IS NULL OR ended_at >= started_at),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE UNIQUE INDEX wfh_pauses_one_open
  ON wfh_pauses (company_id, attendance_id) WHERE ended_at IS NULL;

ALTER TABLE wfh_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE wfh_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_notices FORCE ROW LEVEL SECURITY;
ALTER TABLE wfh_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE wfh_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_pauses FORCE ROW LEVEL SECURITY;

CREATE POLICY wfh_settings_tenant ON wfh_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY wfh_notices_tenant ON wfh_notices
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY wfh_consents_tenant ON wfh_consents
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY wfh_pauses_tenant ON wfh_pauses
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON wfh_settings, wfh_notices, wfh_consents,
  wfh_pauses TO payroll_app;
GRANT USAGE ON SEQUENCE wfh_consents_seq_seq TO payroll_app;
-- Retention and erasure (Plan 9 Ruling 20): the only DELETE grant.
GRANT DELETE ON wfh_pauses TO payroll_app;
