import type {
  Allowance,
  Fils,
  PayslipInput,
  Payslip,
  SettlementResult,
  TraceLine,
  WorkerClass,
} from "@payroll/engine";
import type { Finding } from "@payroll/wps";
import type { FakeIdentifier } from "./fake-ids";

export type DeptCode = "exec" | "retail" | "corp" | "ops" | "credit" |
  "compliance" | "fin" | "hr" | "it";

/** The demo's special cases; each is on one employee. */
export type CaseTag = "probation" | "leaver" | "unpaid-leave" |
  "overtime" | "night-overtime" | "back-pay" | "missing-iban" |
  "iban-typo" | "loan-over-cap";

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
  /** Head office or branch (all FICTIONAL, all in Abu Dhabi). */
  location: string;
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

/** How a payslip was computed; nationals' pension is not computed. */
export type PayslipBasis = "calculatePayslip" |
  "engine-steps-without-pension";

export interface DemoPayslip {
  id: string;
  employeeId: string;
  basis: PayslipBasis;
  input: PayslipInput;
  payslip: Payslip;
  trace: TraceLine[];
  /**
   * The pension line: "not computed" with its reason (UAE nationals),
   * or null (no pension line for other staff). Never a silent zero.
   */
  pension: { status: "not-computed"; traceId: string;
    reason: { en: string; ar: string } } | null;
  /** Employer cost: computed, or "not computed" (never a silent 0). */
  employer: { status: "computed"; amount: Fils } |
    { status: "not-computed"; note: string };
  /** In the SIF, or held back with the reason. */
  sif: { included: true } | { included: false; reason: string };
}

export interface DemoSettlement {
  employeeId: string;
  /** Unused leave at exit, two decimals for display (exact in trace). */
  unusedLeaveDays: number;
  unusedLeaveBasis: string;
  result: SettlementResult;
  trace: TraceLine[];
}

/** Back pay owed for an earlier month, derived from two engine runs. */
export interface BackPayDerivation {
  employeeId: string;
  /** "Back pay on basic salary"; the note says housing is unchanged. */
  label: string;
  note: string;
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
  /** Net of the payslips held out of the SIF. */
  heldNet: Fils;
}

export interface DemoPayRun {
  id: string;
  year: number;
  month: number;
  /** Prepared by HR, waiting for the General Manager (maker-checker). */
  status: "awaiting-approval";
  payslips: DemoPayslip[];
  totals: RunTotals;
  settlements: DemoSettlement[];
  backPay: BackPayDerivation[];
  /** Run-level items the demo does not compute, with the reason. */
  notComputed: string[];
}

export interface DemoSif {
  fileName: string;
  text: string;
  total: Fils;
  recordCount: number;
  employees: number;
  findings: Finding[];
  report: string;
}

export type LeaveStatus = "approved" | "pending" | "rejected";

export interface DemoLeaveType { id: string; labelKey: string;
  paid: boolean; annualDays: number | null; rule: DemoLeaveRule }

/** Text in both languages (the Arabic NEEDS NATIVE REVIEW). */
export interface LeaveWords { en: string; ar: string }

/**
 * A leave type's rule as the person asking reads it, and what the
 * request form checks. Figures from a rule pack are read from it.
 */
export interface DemoLeaveRule {
  /** How long and how it is paid, in one or two plain sentences. */
  text: LeaveWords;
  /** Most days one request may take, or null (a balance decides). */
  maxDays: number | null;
  /** Whether those days are working days or calendar days. */
  basis: "working" | "calendar";
  /** What has to come with the request, or null. */
  proof: LeaveWords | null;
  /** The (fictional) file name the demo attaches for that proof. */
  proofFile: string | null;
  /** Days of notice asked for (company policy); 0 for none. */
  noticeDays: number;
  /** Years with the company before the type can be used; 0 for any. */
  minServiceYears: number;
  /** Where the rule comes from, in plain words. */
  source: LeaveWords;
}

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
  /** null at exit: use availableDays (no second figure to differ). */
  availableHalves: number | null;
  /** What the leave screens show; at exit, the settlement's figure. */
  availableDays: number;
  /** How a leaver's days are counted (our reading), else null. */
  basis: string | null;
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

export interface DemoExpenseClaim {
  id: string;
  employeeId: string;
  titleKey: string;
  date: string;
  amount: Fils;
  vat: Fils;
  status: "pending" | "approved";
  receipt: string;
}

export type ApprovalKind = "leave" | "pay-run" | "expense";

export interface ApprovalItem {
  id: string;
  kind: ApprovalKind;
  subjectId: string;
  employeeId: string | null;
  requestedOn: string;
  status: "pending";
  amount: Fils | null;
  /** Shown with the amount (the pay run's pension caveat). */
  amountNote: string | null;
  titleKey: string;
  /** Who prepared it and who must decide (never the same person). */
  makerEmployeeId: string;
  checkerEmployeeId: string;
}

export type DocumentKind = "residence-visa" | "emirates-id" | "passport";

export type ExpiryState = "expired" | "expiring-30" | "expiring-90" |
  "valid";

export interface DemoDocument {
  id: string;
  kind: DocumentKind;
  employeeId: string;
  number: FakeIdentifier;
  expiresOn: string;
  state: ExpiryState;
  daysLeft: number;
}

/** Headcount by nationality only: no target, status or fine. */
export interface NationalityHeadcount {
  asOf: string;
  label: "Not confirmed yet";
  headcount: number;
  /** The one headcount sentence (payroll, active, leavers). */
  headcountText: string;
  uaeNationals: number;
  byNationality: { nationality: string; count: number }[];
}

export interface DemoCompany {
  seed: number;
  fake: true;
  /** A FICTIONAL Abu Dhabi bank: invented name, branches and codes. */
  company: { id: string; name: string; nameAr: string; fictional: true;
    emirate: "Abu Dhabi"; employerId: string; bankRoutingCode: string };
  asOf: string;
  /** Every figure's rule scope (shown with each source). */
  rulesScope: string;
  departments: DemoDepartment[];
  employees: DemoEmployee[];
  payRun: DemoPayRun;
  sif: DemoSif;
  leaveTypes: DemoLeaveType[];
  leaveRequests: DemoLeaveRequest[];
  leaveBalances: DemoLeaveBalance[];
  attendance: AttendanceDay[];
  timesheets: TimesheetSummary[];
  expenses: DemoExpenseClaim[];
  approvals: ApprovalItem[];
  documents: DemoDocument[];
  nationalities: NationalityHeadcount;
}
