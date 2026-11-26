-- Plan 9: clock method, work location and geofence outcome on
-- attendance (no coordinate column: the reading is discarded), the
-- "correction" source, and correction requests with approval.

ALTER TABLE attendance
  ADD COLUMN method text CHECK (method IN ('web', 'phone', 'unknown')),
  ADD COLUMN work_location text CHECK (work_location IN ('site', 'remote')),
  ADD COLUMN geofence_mode text
    CHECK (geofence_mode IN ('off', 'record', 'require')),
  ADD COLUMN geofence_result text CHECK (geofence_result IN
    ('inside', 'outside', 'no-location', 'not-applied')),
  ADD COLUMN geofence_site_id uuid,
  ADD COLUMN geofence_distance_m integer,
  ADD COLUMN exception text
    CHECK (exception IN ('outside-geofence', 'no-location'));

ALTER TABLE attendance DROP CONSTRAINT attendance_source_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_source_check
  CHECK (source IN ('self', 'hr', 'correction'));

CREATE TABLE attendance_corrections (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  attendance_id uuid,
  date date NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  reason text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);

ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_corrections_tenant ON attendance_corrections
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
GRANT SELECT, INSERT, UPDATE ON attendance_corrections TO payroll_app;
