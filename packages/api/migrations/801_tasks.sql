-- Plan 8 task manager: tasks, checklist items and comments. Nothing
-- is deleted: tasks are cancelled, checklist items removed by status,
-- comments are append only (insert and select only).

CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  title text NOT NULL,
  description text,
  status text NOT NULL
    CHECK (status IN ('open', 'in-progress', 'done', 'cancelled')),
  assignee_user_id uuid REFERENCES users (id),
  assignee_role text
    CHECK (assignee_role IN ('owner', 'hr', 'manager', 'employee')),
  due_date date,
  employee_id uuid,
  flow_type text
    CHECK (flow_type IN ('onboarding', 'exit', 'requisition', 'goal')),
  flow_id uuid,
  source text NOT NULL CHECK (source IN ('manual', 'onboarding-template',
    'exit-template', 'probation-reminder', 'exit-deadline')),
  rule jsonb,
  created_by uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, employee_id)
    REFERENCES employees (company_id, id),
  CHECK ((flow_type IS NULL) = (flow_id IS NULL))
);
CREATE INDEX tasks_assignee ON tasks (company_id, assignee_user_id, status);
CREATE INDEX tasks_flow ON tasks (company_id, flow_type, flow_id);

CREATE TABLE task_checklist_items (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  task_id uuid NOT NULL,
  label text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  done_by uuid REFERENCES users (id),
  done_at timestamptz,
  status text NOT NULL CHECK (status IN ('active', 'removed')),
  position integer NOT NULL,
  FOREIGN KEY (company_id, task_id) REFERENCES tasks (company_id, id)
);

CREATE TABLE task_comments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies (id),
  task_id uuid NOT NULL,
  author_user_id uuid NOT NULL REFERENCES users (id),
  body text NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (company_id, task_id) REFERENCES tasks (company_id, id)
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items FORCE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY tasks_tenant ON tasks
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY task_checklist_items_tenant ON task_checklist_items
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());
CREATE POLICY task_comments_tenant ON task_comments
  USING (company_id = app_company_id())
  WITH CHECK (company_id = app_company_id());

GRANT SELECT, INSERT, UPDATE ON tasks, task_checklist_items
  TO payroll_app;
GRANT SELECT, INSERT ON task_comments TO payroll_app;
