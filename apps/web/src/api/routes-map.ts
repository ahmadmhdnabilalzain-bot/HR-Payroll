import type { ApiMethod } from "./client";
import { routeById, type RouteDef } from "./contract";

/** ApiClient method to the contract route id it calls. */
const ROUTE_IDS: Record<ApiMethod, string> = {
  login: "login",
  logout: "logout",
  me: "getMe",
  mfaEnrol: "enrolMfa",
  mfaConfirm: "confirmMfa",
  getCompany: "getCompany",
  updateCompany: "updateCompany",
  listDepartments: "listDepartments",
  listEmployees: "listEmployees",
  getEmployee: "getEmployee",
  revealBank: "getEmployeeBank",
  listLeaveTypes: "listLeaveTypes",
  listLeaveRequests: "listLeaveRequests",
  createLeaveRequest: "createLeaveRequest",
  approveLeave: "approveLeaveRequest",
  rejectLeave: "rejectLeaveRequest",
  cancelLeave: "cancelLeaveRequest",
  listLeaveBalances: "getLeaveBalances",
  listAttendance: "listAttendance",
  listPayRuns: "listPayRuns",
  getPayRun: "getPayRun",
  createPayRun: "createPayRun",
  approvePayRun: "approvePayRun",
  voidPayRun: "voidPayRun",
  listPayslips: "listPayRunPayslips",
  getPayslip: "getPayslip",
  createSif: "generateSif",
  getSifFile: "getSifFile",
  downloadSif: "downloadSifFile",
  listAuditEvents: "listAuditEvents",
  verifyAudit: "verifyAuditChain",
  listUsers: "listUsers",
  inviteUser: "inviteUser",
};

/** Resolved once; an unknown route id fails at load, not at call. */
export const CLIENT_ROUTES: Readonly<Record<ApiMethod, RouteDef>> =
  Object.freeze(Object.fromEntries(
    Object.entries(ROUTE_IDS).map(([m, id]) => [m, routeById(id)]),
  ) as Record<ApiMethod, RouteDef>);

export const API_METHODS = Object.keys(ROUTE_IDS) as ApiMethod[];
