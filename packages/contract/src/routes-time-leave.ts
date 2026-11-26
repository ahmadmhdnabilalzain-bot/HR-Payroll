import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import { LeaveRequestCreate } from "./leave";
import {
  CarryOverResult,
  CarryOverRun,
  LeaveBlackout,
  LeaveBlackoutCreate,
  LeaveBlackoutList,
  LeaveBlackoutUpdate,
  LeavePolicy,
  LeavePolicyPut,
  LeavePreview,
} from "./time-leave-policy";
import { YearQuery } from "./time-settings";

const one = { params: IdParams };

/** Plan 9 Task 7: leave policies, blackouts, preview, carry-over. */
export const TIME_LEAVE_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "getLeavePolicy", method: "GET",
    path: "/v1/leave-types/{id}/policy", ...one, response: LeavePolicy }),
  ten(PAYROLL, { id: "putLeavePolicy", method: "PUT",
    path: "/v1/leave-types/{id}/policy", ...one, body: LeavePolicyPut,
    response: LeavePolicy }),
  ten(ALL_ROLES, { id: "listLeaveBlackouts", method: "GET",
    path: "/v1/leave-blackouts", query: YearQuery,
    response: LeaveBlackoutList }),
  ten(PAYROLL, { id: "createLeaveBlackout", method: "POST",
    path: "/v1/leave-blackouts", body: LeaveBlackoutCreate,
    response: LeaveBlackout, status: 201 }),
  ten(PAYROLL, { id: "updateLeaveBlackout", method: "PATCH",
    path: "/v1/leave-blackouts/{id}", ...one, body: LeaveBlackoutUpdate,
    response: LeaveBlackout }),
  ten(ALL_ROLES, { id: "previewLeaveRequest", method: "POST",
    path: "/v1/leave-requests/preview", body: LeaveRequestCreate,
    response: LeavePreview }),
  ten(PAYROLL, { id: "runLeaveCarryOver", method: "POST",
    path: "/v1/leave-carry-over", body: CarryOverRun,
    response: CarryOverResult }),
];
