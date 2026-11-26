import type {
  Allowance,
  EmiratisationResult,
  Fils,
  PayslipInput,
  Payslip,
  SettlementResult,
  TraceLine,
  WorkerClass,
} from "@payroll/engine";
import type { Finding } from "@payroll/wps";
import type { FakeIdentifier } from "./fake-ids";

export type DeptCode = "fin" | "ops" | "sal" | "eng" | "ppl" | "cs";

/** The demo's special cases; each appears on exactly one employee. */
export type CaseTag = "probation" | "leaver" | "unpaid-leave" |
  "overtime" | "back-pay" | "missing-iban" | "loan";

export interface DemoDepartment { id: string; code: DeptCode;
  labelKey: string }

export interface DemoEmployee {
  id: string;
  number: string;
  fullName: string;
  /** Arabic name where the person has one; NEEDS NATIVE REVIEW. */
  fullNameAr: string | null;
  email: string;
  departmentId: string;
  jobKey: string;
  grade: number;
  nationality: string;
  workerClass: WorkerClass;
  joiningDate: string;
  leavingDate: string | null;
  probationMonths: number;
  /** From the engine's calculateProbation, never typed. */
  probationEndDate: string | null;
  basicMonthly: Fils;
  allowances: Allowance[];
  emiratesId: FakeIdentifier;
  /** null: the missing-IBAN case. */
  iban: FakeIdentifier | null;
  routingCode: string;
  labourPersonId: string;
  cases: CaseTag[];
}

export interface DemoPayslip {
  id: string;
  employeeId: string;
  input: PayslipInput;
  payslip: Payslip;
  trace: TraceLine[];
}

export interface DemoSettlement {
  employeeId: string;
  unusedLeaveDays: number;
  result: SettlementResult;
  trace: TraceLine[];
}

/** Back pay owed for an earlier month, derived from two engine runs. */
export interface BackPayDerivation {
  employeeId: string;
  forMonth: string;
  paidGross: Fils;
  owedGross: Fils;
  amount: Fils;
  paidTrace: TraceLine[];
  owedTrace: TraceLine[];
}

export interface RunTotals {
  payslips: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  employerCost: Fils;
}

export interface DemoPayRun {
  id: string;
  year: number;
  month: number;
  status: "approved";
  payslips: DemoPayslip[];
  totals: RunTotals;
  settlements: DemoSettlement[];
  backPay: BackPayDerivation[];
  /** Override keys the demo supplies, with the reason (assumptions). */
  assumptions: { key: string; value: string; reason: string }[];
}

export interface DemoSif {
  fileName: string;
  text: string;
  total: Fils;
  recordCount: number;
  findings: Finding[];
  report: string;
}

export type LeaveStatus = "approved" | "pending" | "rejected";

export interface DemoLeaveType { id: string; labelKey: string;
  paid: boolean; annualDays: number | null }

export interface DemoLeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halves: number;
  status: LeaveStatus;
  reasonKey: string;
}

export interface DemoLeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  accruedHalves: number;
  takenHalves: number;
  pendingHalves: number;
  availableHalves: number;
}

export type DayStatus = "present" | "leave" | "absent-unpaid";

export interface AttendanceDay {
  employeeId: string;
  date: string;
  status: DayStatus;
  clockIn: string | null;
  clockOut: string | null;
  workedMinutes: number;
  overtimeMinutes: number;
}

export interface TimesheetSummary {
  employeeId: string;
  month: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  unpaidDays: number;
  workedMinutes: number;
  overtimeMinutes: number;
}

export type ApprovalKind = "leave" | "pay-run" | "expense" |
  "document-renewal" | "overtime";

export interface ApprovalItem {
  id: string;
  kind: ApprovalKind;
  subjectId: string;
  employeeId: string | null;
  requestedOn: string;
  status: "pending";
  amount: Fils | null;
  titleKey: string;
}

export type DocumentKind = "passport" | "residence-visa" |
  "emirates-id" | "labour-card" | "trade-licence";

export type ExpiryState = "expired" | "expiring-30" | "expiring-90" |
  "valid";

export interface DemoDocument {
  id: string;
  kind: DocumentKind;
  employeeId: string | null;
  number: FakeIdentifier;
  expiresOn: string;
  state: ExpiryState;
  daysLeft: number;
}

export interface DemoGoal {
  id: string;
  employeeId: string | null;
  departmentId: string | null;
  titleKey: string;
  target: number;
  actual: number;
  unit: "percent" | "count" | "days";
  dueOn: string;
}

export interface GpssaSummary {
  nationals: number;
  employeeShare: Fils;
  employerShare: Fils;
  byEmployee: { employeeId: string; employeeShare: Fils;
    employerShare: Fils }[];
}

export interface DemoCompany {
  seed: number;
  fake: true;
  company: { id: string; name: string; nameAr: string;
    employerId: string; bankRoutingCode: string };
  asOf: string;
  departments: DemoDepartment[];
  employees: DemoEmployee[];
  payRun: DemoPayRun;
  sif: DemoSif;
  leaveTypes: DemoLeaveType[];
  leaveRequests: DemoLeaveRequest[];
  leaveBalances: DemoLeaveBalance[];
  attendance: AttendanceDay[];
  timesheets: TimesheetSummary[];
  approvals: ApprovalItem[];
  emiratisation: EmiratisationResult;
  gpssa: GpssaSummary;
  documents: DemoDocument[];
  goals: DemoGoal[];
}
