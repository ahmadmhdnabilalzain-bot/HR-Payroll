import { ALL_ROLES, PAYROLL, ten, type RouteDef } from "./route-def";
import {
  WfhActivityResult,
  WfhActivityUpload,
  WfhDayList,
  WfhDaySummaryList,
  WfhExport,
  WfhLocationList,
  WfhLocationPoint,
  WfhLocationQuery,
  WfhLocationUpload,
  WfhRangeQuery,
  WfhSummaryQuery,
} from "./time-wfh-data";

/** Plan 9 Task 10: WFH uploads, own data, summaries, locations. */
export const TIME_WFH_DATA_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "postWfhActivity", method: "POST",
    path: "/v1/wfh/activity", body: WfhActivityUpload,
    response: WfhActivityResult }),
  ten(ALL_ROLES, { id: "postWfhLocation", method: "POST",
    path: "/v1/wfh/location", body: WfhLocationUpload,
    response: WfhLocationPoint, status: 201 }),
  ten(ALL_ROLES, { id: "getMyWfhDays", method: "GET",
    path: "/v1/wfh/me/days", query: WfhRangeQuery, response: WfhDayList }),
  ten(ALL_ROLES, { id: "exportMyWfhData", method: "GET",
    path: "/v1/wfh/me/export", response: WfhExport }),
  ten(ALL_ROLES, { id: "getWfhSummary", method: "GET",
    path: "/v1/wfh/summary", query: WfhSummaryQuery,
    response: WfhDaySummaryList }),
  ten(PAYROLL, { id: "listWfhLocations", method: "GET",
    path: "/v1/wfh/locations", query: WfhLocationQuery,
    response: WfhLocationList, mfa: true }),
];
