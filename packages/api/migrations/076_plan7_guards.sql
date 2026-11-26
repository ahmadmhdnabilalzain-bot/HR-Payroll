-- Plan 7 review (minor 1): database guards the application already
-- keeps, made explicit. No existing row is read or changed here.

-- A verification is recorded once and never moved or cleared.
CREATE FUNCTION document_verify_once() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.verified_by IS NOT NULL AND
     (NEW.verified_by IS DISTINCT FROM OLD.verified_by OR
      NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    RAISE EXCEPTION 'a document version is verified once';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER document_verify_once BEFORE UPDATE
  ON employee_document_versions
  FOR EACH ROW EXECUTE FUNCTION document_verify_once();

-- Status only draft -> published -> superseded; the publish time and
-- a recorded review (status, name and time) never change.
CREATE OR REPLACE FUNCTION letter_version_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.body <> OLD.body OR NEW.fields <> OLD.fields OR
     NEW.uses_salary <> OLD.uses_salary OR NEW.version <> OLD.version OR
     (OLD.status = 'superseded') OR
     (OLD.status = 'published' AND NEW.status = 'draft') OR
     (OLD.status = 'draft' AND NEW.status = 'superseded') OR
     (OLD.published_at IS NOT NULL AND
      NEW.published_at IS DISTINCT FROM OLD.published_at) OR
     (OLD.review_status = 'reviewed' AND
      (NEW.review_status IS DISTINCT FROM 'reviewed' OR
       NEW.reviewer_name IS DISTINCT FROM OLD.reviewer_name OR
       NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)) THEN
    RAISE EXCEPTION 'letter template versions are immutable';
  END IF;
  RETURN NEW;
END $$;

-- A new file row is the caller's own, unclaimed upload. Restrictive:
-- it narrows the tenant policy for every INSERT.
CREATE POLICY files_insert_own ON files AS RESTRICTIVE FOR INSERT
  WITH CHECK (company_id = app_company_id() AND attached_to IS NULL
    AND uploaded_by = app_user_id());
