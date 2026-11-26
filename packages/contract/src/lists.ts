import { AttendanceRecord } from "./attendance";
import { Department } from "./department";
import { EmployeeView } from "./employee";
import { LeaveBalance, LeaveRequest, LeaveType } from "./leave";
import { PayRun, Payslip } from "./payroll";
import { listOf } from "./primitives";
import { CompanyUser } from "./user";

/** Named list responses, each `{ items: T[] }`. */
export const CompanyUserList = listOf(CompanyUser);
export const EmployeeList = listOf(EmployeeView);
export const DepartmentList = listOf(Department);
export const LeaveTypeList = listOf(LeaveType);
export const LeaveRequestList = listOf(LeaveRequest);
export const LeaveBalanceList = listOf(LeaveBalance);
export const AttendanceRecordList = listOf(AttendanceRecord);
export const PayRunList = listOf(PayRun);
export const PayslipList = listOf(Payslip);
