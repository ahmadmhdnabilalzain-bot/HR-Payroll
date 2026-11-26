-- Plan 6: expense categories and the company expense policy. The
-- policy body (limits, mileage and per diem rates) is JSON with
-- amounts as wire strings; rates are company values, never statutory.

CREATE TABLE expense_categories (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  code text NOT NULL CHECK (code ~ '^[a-z][a-z0-9-]{0,31}$'),
  name text NOT NULL,
  name_ar text,
  kind text NOT NULL CHECK (kind IN ('receipt', 'mileage', 'per-diem')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, code),
  UNIQUE (company_id, id)
);

CREATE TABLE expense_policies (
  company_id uuid PRIMARY KEY REFERENCES companies (id),
  version integer NOT NULL CHECK (version >= 1),
  claim_window_days integer
    CHECK (claim_window_days BETWEEN 1 AND 3650),
  body jsonb NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_policies FORCE ROW LEVEL SECURITY;

CREATE POLICY expense_categories_tenant ON expense_categories
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY expense_policies_tenant ON expense_policies
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON expense_categories, expense_policies
  TO payroll_app;
