-- Data-protection review M-7 (2026-11-26): "self" visibility depends
-- on the membership's employee link, so one employee record links to
-- at most one user in a company. Open invites are checked by the app.

CREATE UNIQUE INDEX memberships_one_user_per_employee
  ON memberships (company_id, employee_id) WHERE employee_id IS NOT NULL;
