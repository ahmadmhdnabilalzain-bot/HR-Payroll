-- Plan 8 exits: one open exit per employee (partial unique index).
-- The reason and the stored settlement are encrypted with the
-- company's data key (AAD "<companyId>:exits:<column>:<exitId>").

CREATE TABLE exits (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('resignation', 'termination',
    'summary-dismissal', 'worker-exit-without-notice',
    'probation-employer-termination', 'probation-leave-state',
    'probation-new-employer')),
  status text NOT NULL CHECK (status IN ('requested', 'in-notice',
    'rejected', 'withdrawn', 'closed')),
  notice_given_date date NOT NULL,
  notice_days integer NOT NULL CHECK (notice_days >= 0),
  last_working_date date NOT NULL,
  settlement_due_date date NOT NULL,
  in_probation boolean NOT NULL,
  flags text[] NOT NULL,
  notice_trace jsonb NOT NULL,
  reason_enc text,
  requested_by uuid NOT NULL REFERENCES users (id),
  decided_by uuid REFERENCES users (id),
  decided_at timestamptz,
  decision_note text,
  prior_last_working_date date,
  settlement_enc text,
  settlement_version integer NOT NULL DEFAULT 0,
  closed_at timestamptz,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id)
);
CREATE UNIQUE INDEX exits_one_open ON exits (company_id, employee_id)
  WHERE status IN ('requested', 'in-notice');

ALTER TABLE exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exits FORCE ROW LEVEL SECURITY;
CREATE POLICY exits_tenant ON exits
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON exits TO payroll_app;
