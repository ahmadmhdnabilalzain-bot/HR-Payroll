-- Plan 7: letter templates. Every edit is a new version; a version's
-- body never changes. One published version per template; Arabic
-- versions carry a native-review state, English ones none.

CREATE TABLE letter_templates (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  kind text NOT NULL CHECK (kind IN ('salary-certificate', 'noc',
    'experience', 'offer', 'warning')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  lang text NOT NULL CHECK (lang IN ('en', 'ar')),
  starter boolean NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (company_id, id)
);

CREATE TABLE letter_template_versions (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  template_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  status text NOT NULL CHECK (status IN
    ('draft', 'published', 'superseded')),
  body jsonb NOT NULL,
  fields text[] NOT NULL,
  uses_salary boolean NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL,
  published_at timestamptz,
  review_status text CHECK (review_status IN
    ('needs-native-review', 'reviewed')),
  reviewer_name text CHECK (char_length(reviewer_name) BETWEEN 2 AND 80),
  reviewed_at timestamptz,
  UNIQUE (template_id, version),
  UNIQUE (company_id, id),
  CHECK ((status = 'draft') = (published_at IS NULL)),
  CHECK ((review_status = 'reviewed') =
    (reviewer_name IS NOT NULL AND reviewed_at IS NOT NULL)),
  FOREIGN KEY (company_id, template_id)
    REFERENCES letter_templates (company_id, id)
);
CREATE UNIQUE INDEX letter_template_one_published
  ON letter_template_versions (template_id) WHERE status = 'published';

-- Only the status moves forward (draft, published, superseded) and a
-- review is recorded once; the body and fields never change.
CREATE FUNCTION letter_version_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.body <> OLD.body OR NEW.fields <> OLD.fields OR
     NEW.uses_salary <> OLD.uses_salary OR NEW.version <> OLD.version OR
     (OLD.status = 'superseded') OR
     (OLD.status = 'published' AND NEW.status = 'draft') OR
     (OLD.review_status = 'reviewed' AND
      NEW.review_status IS DISTINCT FROM 'reviewed') THEN
    RAISE EXCEPTION 'letter template versions are immutable';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER letter_version_guard BEFORE UPDATE
  ON letter_template_versions
  FOR EACH ROW EXECUTE FUNCTION letter_version_guard();

ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE letter_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_template_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY letter_templates_tenant ON letter_templates
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY letter_template_versions_tenant
  ON letter_template_versions
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT ON letter_templates, letter_template_versions
  TO payroll_app;
GRANT UPDATE (status, published_at, review_status, reviewer_name,
  reviewed_at) ON letter_template_versions TO payroll_app;
