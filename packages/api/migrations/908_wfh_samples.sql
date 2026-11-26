-- Plan 9: work-from-home samples. One yes-or-no and one category per
-- minute; one location about an hour apart, rounded to 3 decimals
-- (about 110 m). No accuracy, no indicator flag, no page, title, web
-- address, keystroke or screen column. Deleted by retention and
-- erasure only (Ruling 20).

CREATE TABLE wfh_activity_minutes (
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  attendance_id uuid NOT NULL,
  at timestamptz NOT NULL,
  active boolean NOT NULL,
  category text CHECK (category IN ('communication', 'meetings',
    'documents', 'spreadsheets', 'development', 'design', 'research',
    'business-apps', 'social-media', 'entertainment', 'shopping', 'news',
    'personal', 'other')),
  PRIMARY KEY (company_id, employee_id, at),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE INDEX wfh_activity_minutes_at ON wfh_activity_minutes
  (company_id, at);

CREATE TABLE wfh_location_samples (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  attendance_id uuid NOT NULL,
  at timestamptz NOT NULL,
  lat_e3 integer NOT NULL CHECK (lat_e3 BETWEEN -90000 AND 90000),
  lng_e3 integer NOT NULL CHECK (lng_e3 BETWEEN -180000 AND 180000),
  source text NOT NULL CHECK (source IN ('phone', 'browser')),
  UNIQUE (company_id, employee_id, at),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE INDEX wfh_location_samples_at ON wfh_location_samples
  (company_id, at);

ALTER TABLE wfh_activity_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_activity_minutes FORCE ROW LEVEL SECURITY;
ALTER TABLE wfh_location_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_location_samples FORCE ROW LEVEL SECURITY;
CREATE POLICY wfh_activity_minutes_tenant ON wfh_activity_minutes
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY wfh_location_samples_tenant ON wfh_location_samples
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, DELETE ON wfh_activity_minutes,
  wfh_location_samples TO payroll_app;
