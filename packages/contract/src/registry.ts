import type { z } from "zod";
import * as attendance from "./attendance";
import * as audit from "./audit";
import * as company from "./company";
import * as department from "./department";
import * as employee from "./employee";
import { ApiErrorBody } from "./errors";
import { EXPENSE_SCHEMAS } from "./registry-expenses";
import * as leave from "./leave";
import * as lists from "./lists";
import * as payroll from "./payroll";
import { Health, NoContent } from "./primitives";
import * as sif from "./sif";
import * as trace from "./trace";
import * as user from "./user";
import { TIME_SCHEMAS } from "./registry-time";

/** Named schemas: OpenAPI components and the keys of `EXAMPLES`. */
export const SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  Health,
  NoContent,
  ApiErrorBody,
  ...pick(company, ["Company", "CompanyUpdate", "SignupRequest"]),
  ...pick(user, ["User", "Membership", "LoginRequest", "LoginResponse",
    "Me", "InviteRequest", "InviteResponse", "AcceptInviteRequest",
    "MfaEnrolRequest", "MfaEnrolResponse", "MfaConfirmRequest",
    "CompanyUser",
    "RoleChange"]),
  ...pick(department, ["Department", "DepartmentCreate",
    "DepartmentUpdate"]),
  ...pick(employee, ["SalaryComponent", "SalaryUpdate", "BankDetails",
    "BankMasked", "EmployeeCreate", "EmployeeUpdate", "EmployeeView"]),
  ...pick(leave, ["LeaveType", "LeaveTypeCreate", "LeaveTypeUpdate",
    "LeaveRequest", "LeaveRequestCreate", "LeaveDecision",
    "LeaveAdjustmentCreate", "LeaveAdjustment", "LeaveBalance"]),
  ...pick(attendance, ["AttendanceRecord", "AttendanceCorrection"]),
  ...pick(trace, ["TraceRule", "TraceLine"]),
  ...pick(payroll, ["PayRunEntry", "PayRunCreate", "PayRunProblem",
    "PayRun", "PayslipLine", "Settlement", "Payslip"]),
  ...pick(sif, ["Finding", "SifFile", "SifText"]),
  ...pick(audit, ["AuditEvent", "AuditVerifyResult", "AuditEventPage"]),
  ...pick(lists, Object.keys(lists)),
  ...TIME_SCHEMAS,
  ...EXPENSE_SCHEMAS,
};

function pick(
  mod: Record<string, unknown>,
  names: readonly string[],
): Record<string, z.ZodType> {
  const out: Record<string, z.ZodType> = {};
  for (const n of names) {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    out[n] = s as z.ZodType;
  }
  return out;
}

/** The registered name of a schema object, or null. */
export function schemaName(s: z.ZodType): string | null {
  for (const [name, v] of Object.entries(SCHEMAS)) if (v === s) return name;
  return null;
}
