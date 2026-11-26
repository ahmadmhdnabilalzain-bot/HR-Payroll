import { IDS, PEOPLE_EXAMPLES } from "./examples-people";

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
  offer: "00000000-0000-4000-8000-000000000809",
  flow: "00000000-0000-4000-8000-00000000080a",
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

const termsTrace = [{
  id: "employment.probation.end", label: "Probation end date",
  formula: "joining date + months (clamped to month end) - 1 day",
  inputs: { joiningDate: "2026-04-01", probationMonths: "3" },
  result: "2026-06-30",
  // No legal value in the contract: real rules come from the engine.
  rules: [],
}];

const offer = {
  id: HR_IDS.offer, applicationId: HR_IDS.application,
  candidateName: "Sample Candidate", jobTitle: "Accountant",
  departmentId: IDS.department, managerId: IDS.manager,
  startDate: "2026-04-01",
  salary: [{ code: "basic", label: "Basic salary", labelAr: null,
    amount: "1234.00", sifBucket: "fixed" }],
  probationMonths: 3, probationEndDate: "2026-06-30",
  contractNoticeDays: 30, termsTrace, expiresOn: "2026-03-15",
  status: "approved", createdBy: IDS.user, decidedBy: IDS.user,
  decidedAt: AT, respondedOn: null, employeeId: null, createdAt: AT,
};

const template = {
  kind: "onboarding", version: 0, isDefault: true,
  label: "product default, not law",
  items: [{ title: "Collect bank details for salary",
    category: "payroll", assignee: "hr", dueOffsetDays: 0 }],
};

const terms = {
  employeeId: IDS.employee, probationMonths: 3,
  probationEndDate: "2026-06-30", employerNoticeDeadline: "2026-06-16",
  contractNoticeDays: 30, trace: termsTrace, updatedAt: AT,
};

const hireResult = {
  employee: PEOPLE_EXAMPLES.EmployeeView, terms,
  flowId: HR_IDS.flow, tasks: [taskSummary],
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
  Offer: offer,
  OfferList: { items: [offer] },
  ChecklistTemplate: template,
  ChecklistTemplateList: { items: [template] },
  EmploymentTerms: terms,
  HireResult: hireResult,
};
