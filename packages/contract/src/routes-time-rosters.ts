import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  DECIDERS,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import {
  PublishResult,
  RosterDayList,
  RosterPublish,
  RosterPut,
  RosterQuery,
  RosterResult,
  RotationApply,
  ShiftTemplate,
  ShiftTemplateCreate,
  ShiftTemplateList,
  ShiftTemplateUpdate,
  SwapCreate,
  SwapDecision,
  SwapRequest,
  SwapRequestList,
  SwapRespond,
} from "./time-rosters";

const one = { params: IdParams };
const swap = (id: string, verb: string, roles = ALL_ROLES,
  body: RouteDef["body"] = undefined): RouteDef =>
  ten(roles, { id, method: "POST", path: `/v1/time/swaps/{id}/${verb}`,
    ...one, ...(body ? { body } : {}), response: SwapRequest });

/** Plan 9 Task 4: shift templates, rosters, publishing, swaps. */
export const TIME_ROSTER_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listShiftTemplates", method: "GET",
    path: "/v1/time/shifts", response: ShiftTemplateList }),
  ten(PAYROLL, { id: "createShiftTemplate", method: "POST",
    path: "/v1/time/shifts", body: ShiftTemplateCreate,
    response: ShiftTemplate, status: 201 }),
  ten(PAYROLL, { id: "updateShiftTemplate", method: "PATCH",
    path: "/v1/time/shifts/{id}", ...one, body: ShiftTemplateUpdate,
    response: ShiftTemplate }),
  ten(ALL_ROLES, { id: "getRoster", method: "GET",
    path: "/v1/time/roster", query: RosterQuery, response: RosterDayList }),
  ten(DECIDERS, { id: "putRosterEntries", method: "PUT",
    path: "/v1/time/roster", body: RosterPut, response: RosterResult }),
  ten(DECIDERS, { id: "applyRotation", method: "POST",
    path: "/v1/time/roster/rotation", body: RotationApply,
    response: RosterResult }),
  ten(DECIDERS, { id: "publishRoster", method: "POST",
    path: "/v1/time/roster/publish", body: RosterPublish,
    response: PublishResult }),
  ten(ALL_ROLES, { id: "listSwapRequests", method: "GET",
    path: "/v1/time/swaps", response: SwapRequestList }),
  ten(ALL_ROLES, { id: "createSwapRequest", method: "POST",
    path: "/v1/time/swaps", body: SwapCreate, response: SwapRequest,
    status: 201 }),
  swap("respondSwapRequest", "respond", ALL_ROLES, SwapRespond),
  swap("approveSwapRequest", "approve", DECIDERS, SwapDecision),
  swap("rejectSwapRequest", "reject", DECIDERS, SwapDecision),
  swap("cancelSwapRequest", "cancel"),
];
