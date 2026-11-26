import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  DECIDERS,
  ten,
  type RouteDef,
} from "./route-def";
import {
  CorrectionCreate,
  CorrectionQuery,
  CorrectionReject,
  CorrectionRequest,
  CorrectionRequestList,
} from "./time-clock";

const one = { params: IdParams };
const P = "/v1/attendance/correction-requests";

/** Plan 9 Task 5: attendance correction requests with approval. */
export const TIME_CLOCK_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listCorrectionRequests", method: "GET", path: P,
    query: CorrectionQuery, response: CorrectionRequestList }),
  ten(ALL_ROLES, { id: "createCorrectionRequest", method: "POST", path: P,
    body: CorrectionCreate, response: CorrectionRequest, status: 201 }),
  ten(DECIDERS, { id: "approveCorrectionRequest", method: "POST",
    path: `${P}/{id}/approve`, ...one, response: CorrectionRequest }),
  ten(DECIDERS, { id: "rejectCorrectionRequest", method: "POST",
    path: `${P}/{id}/reject`, ...one, body: CorrectionReject,
    response: CorrectionRequest }),
  ten(ALL_ROLES, { id: "cancelCorrectionRequest", method: "POST",
    path: `${P}/{id}/cancel`, ...one, response: CorrectionRequest }),
];
