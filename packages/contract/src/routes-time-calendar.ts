import { IdParams } from "./primitives";
import { ALL_ROLES, PAYROLL, ten, type RouteDef } from "./route-def";
import {
  AttendanceFlagList,
  AvailabilityDayList,
  CalendarDayList,
  CalendarQuery,
  DepartmentStaffing,
  FlagQuery,
  StaffingPut,
} from "./time-calendar";

/** Plan 9 Task 8: leave calendar, availability, attendance flags. */
export const TIME_CALENDAR_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "getLeaveCalendar", method: "GET",
    path: "/v1/time/calendar", query: CalendarQuery,
    response: CalendarDayList }),
  ten(ALL_ROLES, { id: "getTeamAvailability", method: "GET",
    path: "/v1/time/availability", query: CalendarQuery,
    response: AvailabilityDayList }),
  ten(PAYROLL, { id: "putStaffingMinimum", method: "PUT",
    path: "/v1/departments/{id}/staffing", params: IdParams,
    body: StaffingPut, response: DepartmentStaffing }),
  ten(ALL_ROLES, { id: "listAttendanceFlags", method: "GET",
    path: "/v1/time/flags", query: FlagQuery,
    response: AttendanceFlagList }),
];
