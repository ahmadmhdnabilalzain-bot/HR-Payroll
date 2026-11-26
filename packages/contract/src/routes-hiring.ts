import {
  Application,
  ApplicationCreate,
  ApplicationList,
  ApplicationQuery,
  Candidate,
  CandidateCreate,
  CandidateList,
  Decision,
  Interview,
  InterviewCreate,
  Requisition,
  RequisitionClose,
  RequisitionCreate,
  RequisitionList,
  ScorecardCreate,
  StageMove,
} from "./hiring";
import { IdParams } from "./primitives";
import { DECIDERS, PAYROLL, ten, type RouteDef } from "./route-def";

const one = { params: IdParams };

const REQUISITIONS: readonly RouteDef[] = [
  ten(DECIDERS, { id: "listRequisitions", method: "GET",
    path: "/v1/requisitions", response: RequisitionList }),
  ten(DECIDERS, { id: "createRequisition", method: "POST",
    path: "/v1/requisitions", body: RequisitionCreate,
    response: Requisition, status: 201 }),
  ten(DECIDERS, { id: "getRequisition", method: "GET",
    path: "/v1/requisitions/{id}", ...one, response: Requisition }),
  ten(PAYROLL, { id: "decideRequisition", method: "POST",
    path: "/v1/requisitions/{id}/decision", ...one, body: Decision,
    response: Requisition }),
  ten(DECIDERS, { id: "closeRequisition", method: "POST",
    path: "/v1/requisitions/{id}/close", ...one, body: RequisitionClose,
    response: Requisition }),
];

const CANDIDATES: readonly RouteDef[] = [
  ten(PAYROLL, { id: "listCandidates", method: "GET",
    path: "/v1/candidates", response: CandidateList }),
  ten(PAYROLL, { id: "createCandidate", method: "POST",
    path: "/v1/candidates", body: CandidateCreate, response: Candidate,
    status: 201 }),
];

const APPLICATIONS: readonly RouteDef[] = [
  ten(DECIDERS, { id: "listApplications", method: "GET",
    path: "/v1/applications", query: ApplicationQuery,
    response: ApplicationList }),
  ten(PAYROLL, { id: "createApplication", method: "POST",
    path: "/v1/applications", body: ApplicationCreate,
    response: Application, status: 201 }),
  ten(DECIDERS, { id: "getApplication", method: "GET",
    path: "/v1/applications/{id}", ...one, response: Application }),
  ten(DECIDERS, { id: "moveApplicationStage", method: "POST",
    path: "/v1/applications/{id}/stage", ...one, body: StageMove,
    response: Application }),
  ten(DECIDERS, { id: "submitScorecard", method: "POST",
    path: "/v1/applications/{id}/scorecards", ...one,
    body: ScorecardCreate, response: Application, status: 201 }),
  ten(DECIDERS, { id: "scheduleInterview", method: "POST",
    path: "/v1/applications/{id}/interviews", ...one,
    body: InterviewCreate, response: Application, status: 201 }),
  ten(DECIDERS, { id: "cancelInterview", method: "POST",
    path: "/v1/interviews/{id}/cancel", ...one, response: Interview }),
];

/** Plan 8 Task 3: requisitions and the applicant tracker. */
export const HIRING_ROUTES: readonly RouteDef[] = [
  ...REQUISITIONS,
  ...CANDIDATES,
  ...APPLICATIONS,
];
