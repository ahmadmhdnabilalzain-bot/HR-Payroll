import { IDS } from "./examples-people";

/** Example ids for Plan 8's records. All invented. */
export const HR_IDS = {
  task: "00000000-0000-4000-8000-000000000801",
  item: "00000000-0000-4000-8000-000000000802",
  comment: "00000000-0000-4000-8000-000000000803",
} as const;

const AT = "2026-03-01T08:00:00Z";

const taskSummary = {
  id: HR_IDS.task,
  title: "Collect bank details for salary",
  status: "open",
  assigneeUserId: null,
  assigneeRole: "hr",
  dueDate: "2026-03-15",
  overdue: false,
  employeeId: IDS.employee,
  flow: null,
  source: "manual",
  rule: null,
  checklistDone: 0,
  checklistTotal: 1,
  commentCount: 1,
  createdBy: IDS.user,
  createdAt: AT,
  completedAt: null,
};

const task = {
  ...taskSummary,
  description: "Ask for an IBAN letter from the bank.",
  checklist: [{ id: HR_IDS.item, label: "IBAN letter received",
    done: false, doneBy: null, doneAt: null, status: "active" }],
  comments: [{ id: HR_IDS.comment, authorUserId: IDS.user,
    body: "Requested by email.", createdAt: AT }],
};

/** One example per Plan 8 response schema. */
export const HR_EXAMPLES: Readonly<Record<string, unknown>> = {
  TaskSummary: taskSummary,
  Task: task,
  TaskSummaryList: { items: [taskSummary] },
};
