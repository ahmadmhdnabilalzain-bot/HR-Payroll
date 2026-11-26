import { IDS } from "./examples-people";

/** Example ids for Plan 8's records. All invented. */
export const HR_IDS = {
  task: "00000000-0000-4000-8000-000000000801",
  item: "00000000-0000-4000-8000-000000000802",
  comment: "00000000-0000-4000-8000-000000000803",
  requisition: "00000000-0000-4000-8000-000000000804",
  candidate: "00000000-0000-4000-8000-000000000805",
  application: "00000000-0000-4000-8000-000000000806",
  interview: "00000000-0000-4000-8000-000000000807",
  scorecard: "00000000-0000-4000-8000-000000000808",
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

const requisition = {
  id: HR_IDS.requisition, title: "Accountant", titleAr: null,
  departmentId: IDS.department, hiringManagerUserId: IDS.user,
  headcount: 1, hiredCount: 0, status: "open", reason: null,
  requestedBy: IDS.user, decidedBy: IDS.user, decidedAt: AT,
  decisionNote: null, createdAt: AT,
};

const candidate = {
  id: HR_IDS.candidate, fullName: "Sample Candidate",
  email: "candidate@example.com", phone: null, source: "referral",
  sourceDetail: null, createdAt: AT,
};

const interview = {
  id: HR_IDS.interview, applicationId: HR_IDS.application,
  startsAt: "2026-03-05T06:00:00Z", endsAt: "2026-03-05T07:00:00Z",
  interviewerUserIds: [IDS.user], location: "Meeting room 1",
  status: "scheduled",
  calendar: { status: "not-connected", externalRef: null },
};

const application = {
  id: HR_IDS.application, requisitionId: HR_IDS.requisition,
  candidate: { id: HR_IDS.candidate, fullName: "Sample Candidate" },
  stage: "interview",
  history: [{ stage: "applied", at: AT, by: IDS.user, note: null }],
  scorecards: [{ id: HR_IDS.scorecard, interviewerUserId: IDS.user,
    criteria: [{ key: "communication", rating: 4, note: null }],
    recommendation: "yes", summary: null, submittedAt: AT }],
  interviews: [interview],
  offerId: null,
  createdAt: AT,
};

/** One example per Plan 8 response schema. */
export const HR_EXAMPLES: Readonly<Record<string, unknown>> = {
  TaskSummary: taskSummary,
  Task: task,
  TaskSummaryList: { items: [taskSummary] },
  Requisition: requisition,
  RequisitionList: { items: [requisition] },
  Candidate: candidate,
  CandidateList: { items: [candidate] },
  Interview: interview,
  Application: application,
  ApplicationList: { items: [application] },
};
