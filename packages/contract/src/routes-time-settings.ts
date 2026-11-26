import { IdParams, listOf } from "./primitives";
import {
  ALL_ROLES,
  DECIDERS,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import {
  Holiday,
  HolidayCreate,
  HolidayUpdate,
  SpecialPeriod,
  SpecialPeriodCreate,
  SpecialPeriodUpdate,
  TimeProfile,
  TimeProfileUpdate,
  TimeSettings,
  TimeSettingsUpdate,
  WorkSite,
  WorkSiteCreate,
  WorkSiteUpdate,
  YearQuery,
} from "./time-settings";

export const HolidayList = listOf(Holiday);
export const SpecialPeriodList = listOf(SpecialPeriod);
export const WorkSiteList = listOf(WorkSite);

const one = { params: IdParams };

/** Plan 9 Task 3: settings, holiday calendar, sites, profiles. */
export const TIME_SETTINGS_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "getTimeSettings", method: "GET",
    path: "/v1/time/settings", response: TimeSettings }),
  ten(PAYROLL, { id: "updateTimeSettings", method: "PUT",
    path: "/v1/time/settings", body: TimeSettingsUpdate,
    response: TimeSettings }),
  ten(ALL_ROLES, { id: "listHolidays", method: "GET",
    path: "/v1/time/holidays", query: YearQuery, response: HolidayList }),
  ten(PAYROLL, { id: "createHoliday", method: "POST",
    path: "/v1/time/holidays", body: HolidayCreate, response: Holiday,
    status: 201 }),
  ten(PAYROLL, { id: "updateHoliday", method: "PATCH",
    path: "/v1/time/holidays/{id}", ...one, body: HolidayUpdate,
    response: Holiday }),
  ten(ALL_ROLES, { id: "listSpecialPeriods", method: "GET",
    path: "/v1/time/special-periods", query: YearQuery,
    response: SpecialPeriodList }),
  ten(PAYROLL, { id: "createSpecialPeriod", method: "POST",
    path: "/v1/time/special-periods", body: SpecialPeriodCreate,
    response: SpecialPeriod, status: 201 }),
  ten(PAYROLL, { id: "updateSpecialPeriod", method: "PATCH",
    path: "/v1/time/special-periods/{id}", ...one,
    body: SpecialPeriodUpdate, response: SpecialPeriod }),
  ten(DECIDERS, { id: "listWorkSites", method: "GET",
    path: "/v1/time/work-sites", response: WorkSiteList }),
  ten(PAYROLL, { id: "createWorkSite", method: "POST",
    path: "/v1/time/work-sites", body: WorkSiteCreate,
    response: WorkSite, status: 201 }),
  ten(PAYROLL, { id: "updateWorkSite", method: "PATCH",
    path: "/v1/time/work-sites/{id}", ...one, body: WorkSiteUpdate,
    response: WorkSite }),
  ten(ALL_ROLES, { id: "getTimeProfile", method: "GET",
    path: "/v1/employees/{id}/time-profile", ...one,
    response: TimeProfile }),
  ten(PAYROLL, { id: "updateTimeProfile", method: "PUT",
    path: "/v1/employees/{id}/time-profile", ...one,
    body: TimeProfileUpdate, response: TimeProfile }),
];
