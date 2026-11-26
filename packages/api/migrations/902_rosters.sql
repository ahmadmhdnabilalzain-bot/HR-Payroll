-- Plan 9: shift templates, roster entries (a draft and a published
-- copy; the published copy is a time snapshot) and shift swaps.

CREATE TABLE shift_templates (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  name text NOT NULL,
  name_ar text,
  start_min integer NOT NULL CHECK (start_min BETWEEN 0 AND 1439),
  end_min integer NOT NULL CHECK (end_min BETWEEN 0 AND 1439),
  break_minutes integer NOT NULL CHECK (break_minutes >= 0),
  status text NOT NULL CHECK (status IN ('active', 'retired')),
  CHECK (end_min <> start_min),
  UNIQUE (company_id, id)
);

CREATE TABLE roster_entries (
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  date date NOT NULL,
  draft_kind text CHECK (draft_kind IN ('shift', 'rest')),
  draft_shift_template_id uuid,
  published_kind text CHECK (published_kind IN ('shift', 'rest')),
  published_template_id uuid,
  published_start_min integer,
  published_end_min integer,
  published_break_minutes integer,
  published_at timestamptz,
  version integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, employee_id, date),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, draft_shift_template_id)
    REFERENCES shift_templates (company_id, id)
);

CREATE TABLE swap_requests (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  requester_employee_id uuid NOT NULL,
  date date NOT NULL,
  peer_employee_id uuid NOT NULL,
  peer_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending-peer',
    'pending-approval', 'approved', 'rejected', 'declined', 'cancelled')),
  requester_version integer NOT NULL,
  peer_version integer NOT NULL,
  requested_by uuid NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (company_id, requester_employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, peer_employee_id)
    REFERENCES employees (company_id, id)
);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY shift_templates_tenant ON shift_templates
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY roster_entries_tenant ON roster_entries
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY swap_requests_tenant ON swap_requests
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON shift_templates, roster_entries,
  swap_requests TO payroll_app;
