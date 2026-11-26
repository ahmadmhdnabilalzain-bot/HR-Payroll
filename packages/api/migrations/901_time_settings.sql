-- Plan 9: company time settings, holiday calendar, special periods
-- (Ramadan), work sites and per-employee time profiles. No built-in
-- calendar: every date is company-entered. Coordinates of work sites
-- are stored as micro-degrees; no employee coordinate is stored here.

CREATE TABLE company_time_settings (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  rest_days text[],
  grace_minutes integer,
  late_flag_threshold integer,
  rest_adjacent_absence_threshold integer,
  short_sick_spell_threshold integer,
  accuracy_allowance_m integer,
  updated_at timestamptz NOT NULL
);

CREATE TABLE holidays (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  date date NOT NULL,
  name text NOT NULL,
  name_ar text,
  kind text NOT NULL CHECK (kind IN ('public', 'company')),
  status text NOT NULL CHECK (status IN ('active', 'removed'))
);
CREATE UNIQUE INDEX holidays_one_active
  ON holidays (company_id, date) WHERE status = 'active';

CREATE TABLE special_periods (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  kind text NOT NULL CHECK (kind IN ('ramadan')),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'removed')),
  CHECK (end_date >= start_date)
);

CREATE TABLE work_sites (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL,
  lat_e6 integer NOT NULL,
  lng_e6 integer NOT NULL,
  radius_m integer NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'removed')),
  UNIQUE (company_id, id)
);

CREATE TABLE employee_time_profiles (
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid PRIMARY KEY,
  work_mode text NOT NULL CHECK (work_mode IN ('site', 'remote', 'hybrid')),
  geofence_mode text NOT NULL
    CHECK (geofence_mode IN ('off', 'record', 'require')),
  work_site_ids uuid[] NOT NULL,
  wfh_tracked boolean NOT NULL,
  shift_worker boolean NOT NULL,
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

ALTER TABLE company_time_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_time_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays FORCE ROW LEVEL SECURITY;
ALTER TABLE special_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sites FORCE ROW LEVEL SECURITY;
ALTER TABLE employee_time_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY company_time_settings_tenant ON company_time_settings
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY holidays_tenant ON holidays
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY special_periods_tenant ON special_periods
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY work_sites_tenant ON work_sites
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY employee_time_profiles_tenant ON employee_time_profiles
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON company_time_settings, holidays,
  special_periods, work_sites, employee_time_profiles TO payroll_app;
