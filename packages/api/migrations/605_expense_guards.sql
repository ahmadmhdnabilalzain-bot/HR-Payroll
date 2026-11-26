-- Plan 6 reviews (money I-2, M-7; security I-3): database guards
-- beside the code. The app role may update only the columns each step
-- writes; a claim's items and amounts are frozen once it leaves draft
-- or returned; a claim joins or leaves a run only as the run's state
-- allows; an approval's key columns never change, and its deciders are
-- never the submitter, the claimant, the claim's makers or another
-- step's decider.

-- Who may never decide a request (claimant users, submitter, makers),
-- fixed when the request opens.
ALTER TABLE approval_requests
  ADD COLUMN excluded uuid[] NOT NULL DEFAULT '{}';
-- Every user who created or edited the claim (makers).
ALTER TABLE expense_claims
  ADD COLUMN editors uuid[] NOT NULL DEFAULT '{}';

-- VAT is part of the VAT-inclusive amount; net of VAT is never < 0.
ALTER TABLE expense_items
  ADD CONSTRAINT expense_items_vat_within_amount
  CHECK (vat_amount <= amount);

-- Column-level UPDATE grants: everything else is immutable for the app.
REVOKE UPDATE ON approval_chains, approval_requests, approval_steps,
  expense_categories, expense_policies, expense_claims, expense_items
  FROM payroll_app;
GRANT UPDATE (version, tiers, over_limit_approver, updated_by,
  updated_at) ON approval_chains TO payroll_app;
GRANT UPDATE (status, current_step, closed_at) ON approval_requests
  TO payroll_app;
GRANT UPDATE (status, decided_by, decided_at, note) ON approval_steps
  TO payroll_app;
GRANT UPDATE (name, name_ar, active) ON expense_categories TO payroll_app;
GRANT UPDATE (version, claim_window_days, body, updated_by, updated_at)
  ON expense_policies TO payroll_app;
GRANT UPDATE (title, status, revision, submitted_by, submitted_at,
  decided_at, approval_id, pay_run_id, policy_version, total, vat_total,
  flags, cancel_note, editors) ON expense_claims TO payroll_app;
GRANT UPDATE (amount, rate_applied, over_limit) ON expense_items
  TO payroll_app;

-- Functions that read tables pin the search path to this schema.
CREATE FUNCTION expense_claim_open(p_company uuid, p_claim uuid)
  RETURNS boolean LANGUAGE sql STABLE
  AS $$
    SELECT coalesce((SELECT status IN ('draft', 'returned')
      FROM expense_claims WHERE company_id = p_company AND id = p_claim),
      false)
  $$;

CREATE FUNCTION expense_items_frozen() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NOT expense_claim_open(NEW.company_id, NEW.claim_id) THEN
    RAISE EXCEPTION 'expense items of claim % are frozen', NEW.claim_id;
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION expense_item_receipts_frozen() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NOT expense_claim_open(NEW.company_id, (SELECT i.claim_id
    FROM expense_items i WHERE i.company_id = NEW.company_id
      AND i.id = NEW.item_id)) THEN
    RAISE EXCEPTION 'expense item % is frozen', NEW.item_id;
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION pay_run_status(p_company uuid, p_run uuid)
  RETURNS text LANGUAGE sql STABLE
  AS $$
    SELECT status FROM pay_runs WHERE company_id = p_company AND id = p_run
  $$;

CREATE FUNCTION expense_claims_guard() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF OLD.status NOT IN ('draft', 'returned') AND (
    NEW.total IS DISTINCT FROM OLD.total OR
    NEW.vat_total IS DISTINCT FROM OLD.vat_total OR
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.revision IS DISTINCT FROM OLD.revision OR
    NEW.editors IS DISTINCT FROM OLD.editors) THEN
    RAISE EXCEPTION 'expense claim % amounts are frozen (claim is %)',
      OLD.id, OLD.status;
  END IF;
  IF NEW.pay_run_id IS DISTINCT FROM OLD.pay_run_id THEN
    IF OLD.pay_run_id IS NOT NULL AND
      pay_run_status(OLD.company_id, OLD.pay_run_id) <> 'void' THEN
      RAISE EXCEPTION 'claim % leaves its run only when the run is void',
        OLD.id;
    END IF;
    IF NEW.pay_run_id IS NOT NULL AND (OLD.pay_run_id IS NOT NULL OR
      pay_run_status(NEW.company_id, NEW.pay_run_id) <> 'draft') THEN
      RAISE EXCEPTION 'claim % joins only a draft run', OLD.id;
    END IF;
  END IF;
  IF NEW.status = 'reimbursed' AND OLD.status <> 'reimbursed' AND
    coalesce(pay_run_status(NEW.company_id, NEW.pay_run_id), '')
      <> 'approved' THEN
    RAISE EXCEPTION 'claim % is reimbursed only by an approved run',
      OLD.id;
  END IF;
  RETURN NEW;
END
$$;

-- A decider is never excluded (claimant, submitter, makers) and never
-- the decider of another step of the same request.
CREATE FUNCTION approval_decider_guard() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.decided_by IS NULL OR
    NEW.decided_by IS NOT DISTINCT FROM OLD.decided_by THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM approval_requests r
      WHERE r.company_id = NEW.company_id AND r.id = NEW.request_id
        AND (NEW.decided_by = ANY (r.excluded)
          OR NEW.decided_by = r.submitted_by
          OR NEW.decided_by IS NOT DISTINCT FROM r.claimant_user_id))
    OR EXISTS (SELECT 1 FROM approval_steps s
      WHERE s.company_id = NEW.company_id AND s.request_id = NEW.request_id
        AND s.step_order <> NEW.step_order
        AND s.decided_by = NEW.decided_by) THEN
    RAISE EXCEPTION 'user % may not decide step % of request %',
      NEW.decided_by, NEW.step_order, NEW.request_id;
  END IF;
  RETURN NEW;
END
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['expense_claim_open(uuid, uuid)',
    'pay_run_status(uuid, uuid)', 'expense_items_frozen()',
    'expense_item_receipts_frozen()', 'expense_claims_guard()',
    'approval_decider_guard()'] LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, %I',
      f, current_schema());
  END LOOP;
END
$$;

CREATE TRIGGER expense_items_frozen
  BEFORE INSERT OR UPDATE ON expense_items
  FOR EACH ROW EXECUTE FUNCTION expense_items_frozen();
CREATE TRIGGER expense_item_receipts_frozen
  BEFORE INSERT ON expense_item_receipts
  FOR EACH ROW EXECUTE FUNCTION expense_item_receipts_frozen();
CREATE TRIGGER expense_claims_guard
  BEFORE UPDATE ON expense_claims
  FOR EACH ROW EXECUTE FUNCTION expense_claims_guard();
CREATE TRIGGER approval_decider_guard
  BEFORE UPDATE ON approval_steps
  FOR EACH ROW EXECUTE FUNCTION approval_decider_guard();
