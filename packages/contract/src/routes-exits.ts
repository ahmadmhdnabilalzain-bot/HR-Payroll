import {
  AccessResult,
  DocumentsRequest,
  Exit,
  ExitCreate,
  ExitList,
  ExitQuery,
  RevokeRequest,
  SettlementInputs,
  UserEmployeeLink,
} from "./exits";
import { Decision } from "./hiring";
import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import { CompanyUser } from "./user";

const one = { params: IdParams };

/** Plan 8 Task 6: the one exit flow and the final settlement. */
export const EXIT_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "createExit", method: "POST", path: "/v1/exits",
    body: ExitCreate, response: Exit, status: 201 }),
  ten(ALL_ROLES, { id: "listExits", method: "GET", path: "/v1/exits",
    query: ExitQuery, response: ExitList }),
  ten(ALL_ROLES, { id: "getExit", method: "GET", path: "/v1/exits/{id}",
    ...one, response: Exit }),
  ten(PAYROLL, { id: "decideExit", method: "POST",
    path: "/v1/exits/{id}/decision", ...one, body: Decision,
    response: Exit }),
  ten(PAYROLL, { id: "computeExitSettlement", method: "POST",
    path: "/v1/exits/{id}/settlement", ...one, body: SettlementInputs,
    response: Exit }),
  ten(ALL_ROLES, { id: "withdrawExit", method: "POST",
    path: "/v1/exits/{id}/withdraw", ...one, response: Exit }),
];

/** Plan 8 Task 7: document and access-revocation hooks, closing. */
export const EXIT_HOOK_ROUTES: readonly RouteDef[] = [
  ten(PAYROLL, { id: "generateExitDocuments", method: "POST",
    path: "/v1/exits/{id}/documents", ...one, body: DocumentsRequest,
    response: Exit }),
  ten(PAYROLL, { id: "revokeExitAccess", method: "POST",
    path: "/v1/exits/{id}/revoke-access", ...one, body: RevokeRequest,
    response: AccessResult, mfa: true }),
  ten(PAYROLL, { id: "closeExit", method: "POST",
    path: "/v1/exits/{id}/close", ...one, response: Exit }),
  ten(OWNER, { id: "linkUserEmployee", method: "PATCH",
    path: "/v1/users/{id}/employee", ...one, body: UserEmployeeLink,
    response: CompanyUser, mfa: true }),
];
