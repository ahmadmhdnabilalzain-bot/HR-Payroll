import { Exit, ExitCreate, ExitList, ExitQuery, SettlementInputs } from
  "./exits";
import { Decision } from "./hiring";
import { IdParams } from "./primitives";
import { ALL_ROLES, PAYROLL, ten, type RouteDef } from "./route-def";

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
