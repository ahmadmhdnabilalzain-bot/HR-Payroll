import {
  AttendanceCorrection,
  AttendanceQuery,
  AttendanceRecord,
} from "./attendance";
import {
  LeaveAdjustment,
  LeaveAdjustmentCreate,
  LeaveBalanceQuery,
  LeaveDecision,
  LeaveRequest,
  LeaveRequestCreate,
  LeaveRequestQuery,
  LeaveType,
  LeaveTypeCreate,
  LeaveTypeUpdate,
} from "./leave";
import {
  AttendanceRecordList,
  LeaveBalanceList,
  LeaveRequestList,
  LeaveTypeList,
} from "./lists";
import { IdParams } from "./primitives";
import { TIME_SETTINGS_ROUTES } from "./routes-time-settings";
import { TIME_ROSTER_ROUTES } from "./routes-time-rosters";
import { TIME_CLOCK_ROUTES } from "./routes-time-clock";
import { TIME_TIMESHEET_ROUTES } from "./routes-time-timesheets";
import { TIME_LEAVE_ROUTES } from "./routes-time-leave";
import { ClockBody } from "./time-clock";
import {
  ALL_ROLES,
  DECIDERS,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";

const one = { params: IdParams };

const LEAVE: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listLeaveTypes", method: "GET",
    path: "/v1/leave-types", response: LeaveTypeList }),
  ten(PAYROLL, { id: "createLeaveType", method: "POST",
    path: "/v1/leave-types", body: LeaveTypeCreate, response: LeaveType,
    status: 201 }),
  ten(PAYROLL, { id: "updateLeaveType", method: "PATCH",
    path: "/v1/leave-types/{id}", ...one, body: LeaveTypeUpdate,
    response: LeaveType }),
  ten(ALL_ROLES, { id: "listLeaveRequests", method: "GET",
    path: "/v1/leave-requests", query: LeaveRequestQuery,
    response: LeaveRequestList }),
  ten(ALL_ROLES, { id: "createLeaveRequest", method: "POST",
    path: "/v1/leave-requests", body: LeaveRequestCreate,
    response: LeaveRequest, status: 201 }),
  ten(ALL_ROLES, { id: "cancelLeaveRequest", method: "POST",
    path: "/v1/leave-requests/{id}/cancel", ...one,
    response: LeaveRequest }),
  ten(DECIDERS, { id: "approveLeaveRequest", method: "POST",
    path: "/v1/leave-requests/{id}/approve", ...one, body: LeaveDecision,
    response: LeaveRequest }),
  ten(DECIDERS, { id: "rejectLeaveRequest", method: "POST",
    path: "/v1/leave-requests/{id}/reject", ...one, body: LeaveDecision,
    response: LeaveRequest }),
  ten(ALL_ROLES, { id: "getLeaveBalances", method: "GET",
    path: "/v1/employees/{id}/leave-balances", ...one,
    query: LeaveBalanceQuery, response: LeaveBalanceList }),
  ten(PAYROLL, { id: "createLeaveAdjustment", method: "POST",
    path: "/v1/leave-adjustments", body: LeaveAdjustmentCreate,
    response: LeaveAdjustment, status: 201 }),
];

const ATTENDANCE: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "clockIn", method: "POST",
    path: "/v1/attendance/clock-in", body: ClockBody.optional(),
    response: AttendanceRecord,
    status: 201 }),
  ten(ALL_ROLES, { id: "clockOut", method: "POST",
    path: "/v1/attendance/clock-out", body: ClockBody.optional(),
    response: AttendanceRecord }),
  ten(ALL_ROLES, { id: "listAttendance", method: "GET",
    path: "/v1/attendance", query: AttendanceQuery,
    response: AttendanceRecordList }),
  ten(PAYROLL, { id: "correctAttendance", method: "PUT",
    path: "/v1/attendance/{id}", ...one, body: AttendanceCorrection,
    response: AttendanceRecord }),
];

/** Plan 3's leave and attendance routes. */
export const LEAVE_ATTENDANCE_ROUTES: readonly RouteDef[] = [...LEAVE,
  ...ATTENDANCE];

/** Plan 9's routes (time, attendance, leave policies, WFH), in order. */
export const TIME_ROUTES: readonly RouteDef[] = [
  ...TIME_SETTINGS_ROUTES,
  ...TIME_ROSTER_ROUTES,
  ...TIME_CLOCK_ROUTES,
  ...TIME_TIMESHEET_ROUTES,
  ...TIME_LEAVE_ROUTES,
];
