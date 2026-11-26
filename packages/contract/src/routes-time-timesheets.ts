import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  DECIDERS,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import { PayInputs } from "./time-pay-inputs";
import {
  OvertimeDecisionInput,
  PeriodQuery,
  Timesheet,
  TimesheetNote,
  TimesheetPrepare,
  TimesheetQuery,
  TimesheetSummaryList,
} from "./time-timesheets";

const one = { params: IdParams };
const T = "/v1/time/timesheets";
const act = (roles: RouteDef["roles"], id: string, verb: string,
  body?: RouteDef["body"]): RouteDef => ten(roles, { id, method: "POST",
  path: `${T}/{id}/${verb}`, ...one, ...(body ? { body } : {}),
  response: Timesheet });

/** Plan 9 Task 6: timesheets, overtime review, payroll time inputs. */
export const TIME_TIMESHEET_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listTimesheets", method: "GET", path: T,
    query: TimesheetQuery, response: TimesheetSummaryList }),
  ten(ALL_ROLES, { id: "getTimesheet", method: "GET", path: `${T}/{id}`,
    ...one, response: Timesheet }),
  ten(ALL_ROLES, { id: "prepareTimesheet", method: "POST", path: T,
    body: TimesheetPrepare, response: Timesheet, status: 201 }),
  act(ALL_ROLES, "submitTimesheet", "submit"),
  act(DECIDERS, "decideOvertime", "overtime", OvertimeDecisionInput),
  act(DECIDERS, "approveTimesheet", "approve"),
  act(DECIDERS, "rejectTimesheet", "reject", TimesheetNote),
  act(PAYROLL, "reopenTimesheet", "reopen", TimesheetNote),
  ten(PAYROLL, { id: "getPayInputs", method: "GET",
    path: "/v1/time/pay-inputs", query: PeriodQuery, response: PayInputs }),
];
