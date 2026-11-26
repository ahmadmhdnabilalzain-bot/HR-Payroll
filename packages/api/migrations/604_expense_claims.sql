-- Plan 6: expense claims, their items (one set per revision; an edit
-- inserts the next revision, nothing is deleted), the receipts each
-- item uses, and the pay-run columns for reimbursements. Amounts are
-- integer fils in clear (not salary) so reports can sum them.

CREATE TABLE expense_claims (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  employee_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'submitted',
    'returned', 'approved', 'rejected', 'cancelled', 'reimbursed')),
  revision integer NOT NULL CHECK (revision >= 1),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  submitted_by uuid,
  submitted_at timestamptz,
  decided_at timestamptz,
  approval_id uuid,
  pay_run_id uuid,
  policy_version integer,
  total bigint NOT NULL CHECK (total >= 0),
  vat_total bigint NOT NULL CHECK (vat_total >= 0),
  flags jsonb NOT NULL,
  cancel_note text,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  FOREIGN KEY (company_id, approval_id)
    REFERENCES approval_requests (company_id, id),
  FOREIGN KEY (company_id, pay_run_id) REFERENCES pay_runs (company_id, id),
  -- Only an approved claim joins a run; reimbursed means it was paid.
  CHECK (pay_run_id IS NULL OR status IN ('approved', 'reimbursed')),
  CHECK (status <> 'reimbursed' OR pay_run_id IS NOT NULL)
);
CREATE INDEX expense_claims_payroll
  ON expense_claims (company_id, status, pay_run_id);
CREATE INDEX expense_claims_employee
  ON expense_claims (company_id, employee_id);

-- Rejected, cancelled and reimbursed claims never change again.
CREATE FUNCTION expense_claims_final() RETURNS trigger
  LANGUAGE plpgsql SET search_path = pg_catalog
  AS $$
BEGIN
  IF OLD.status IN ('rejected', 'cancelled', 'reimbursed') THEN
    RAISE EXCEPTION 'expense claim % is %', OLD.id, OLD.status;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER expense_claims_final
  BEFORE UPDATE ON expense_claims
  FOR EACH ROW EXECUTE FUNCTION expense_claims_final();

CREATE TABLE expense_items (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  claim_id uuid NOT NULL,
  revision integer NOT NULL,
  idx integer NOT NULL CHECK (idx BETWEEN 0 AND 49),
  kind text NOT NULL CHECK (kind IN ('receipt', 'mileage', 'per-diem')),
  category_id uuid NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount bigint NOT NULL CHECK (amount >= 0),
  vat_amount bigint NOT NULL CHECK (vat_amount >= 0),
  supplier_name text,
  supplier_trn text CHECK (supplier_trn ~ '^[0-9]{15}$'),
  distance_km integer,
  days integer,
  rate_code text,
  rate_applied bigint,
  justification text,
  original_currency text,
  original_amount text,
  over_limit boolean NOT NULL DEFAULT false,
  UNIQUE (company_id, id),
  UNIQUE (claim_id, revision, idx),
  FOREIGN KEY (company_id, claim_id)
    REFERENCES expense_claims (company_id, id),
  FOREIGN KEY (company_id, category_id)
    REFERENCES expense_categories (company_id, id),
  CHECK (kind = 'receipt' OR (vat_amount = 0 AND supplier_trn IS NULL))
);

CREATE TABLE expense_item_receipts (
  company_id uuid NOT NULL REFERENCES companies (id),
  item_id uuid NOT NULL,
  receipt_id uuid NOT NULL,
  PRIMARY KEY (item_id, receipt_id),
  FOREIGN KEY (company_id, item_id) REFERENCES expense_items (company_id, id),
  FOREIGN KEY (company_id, receipt_id) REFERENCES receipts (company_id, id)
);
CREATE INDEX expense_item_receipts_receipt
  ON expense_item_receipts (company_id, receipt_id);

-- Reimbursements paid with a run (outside gross; see Plan 6 Task 6).
ALTER TABLE pay_runs
  ADD COLUMN reimbursement_total bigint NOT NULL DEFAULT 0
    CHECK (reimbursement_total >= 0),
  ADD COLUMN claim_count integer NOT NULL DEFAULT 0,
  ADD COLUMN pending_claim_count integer NOT NULL DEFAULT 0;

ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items FORCE ROW LEVEL SECURITY;
ALTER TABLE expense_item_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_item_receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY expense_claims_tenant ON expense_claims
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY expense_items_tenant ON expense_items
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY expense_item_receipts_tenant ON expense_item_receipts
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

-- Items are repriced in place at submit (amount, rate, over-limit).
GRANT SELECT, INSERT, UPDATE ON expense_claims, expense_items
  TO payroll_app;
GRANT SELECT, INSERT ON expense_item_receipts TO payroll_app;
