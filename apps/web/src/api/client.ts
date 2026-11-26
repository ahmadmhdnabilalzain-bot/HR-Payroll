import type {
  AppEmployee,
  AppPayRun,
  AppPayRunCreate,
  AppPayslip,
  AppSifFile,
  AttendanceQuery,
  AttendanceRecord,
  AuditEvent,
  AuditVerifyResult,
  BankDetails,
  Company,
  CompanyUpdate,
  CompanyUser,
  Department,
  InviteRequest,
  InviteResponse,
  LeaveBalance,
  LeaveDecision,
  LeaveRequest,
  LeaveRequestCreate,
  LeaveType,
  LoginRequest,
  LoginResponse,
  Me,
  MfaEnrolResponse,
} from "./contract";

export type LeaveListQuery = {
  employeeId?: string;
  status?: LeaveRequest["status"];
  /** Filtered in the client: the contract's query has no year. */
  year?: number;
};

/** A member as the users list returns it (contract `CompanyUser`). */
export type UserRow = CompanyUser;

export type AuditPage = { events: AuditEvent[]; nextBefore: number | null };

/** Every server call. Each method maps to one ROUTES entry. */
export interface ApiClient {
  login(r: LoginRequest): Promise<LoginResponse>;
  logout(): Promise<void>;
  me(): Promise<Me>;
  mfaEnrol(password: string): Promise<MfaEnrolResponse>;
  mfaConfirm(code: string, password: string): Promise<Me>;
  getCompany(): Promise<Company>;
  updateCompany(u: CompanyUpdate): Promise<Company>;
  listDepartments(): Promise<Department[]>;
  listEmployees(): Promise<AppEmployee[]>;
  getEmployee(id: string): Promise<AppEmployee>;
  revealBank(id: string): Promise<BankDetails>;
  listLeaveTypes(): Promise<LeaveType[]>;
  listLeaveRequests(q?: LeaveListQuery): Promise<LeaveRequest[]>;
  createLeaveRequest(r: LeaveRequestCreate): Promise<LeaveRequest>;
  approveLeave(id: string, d: LeaveDecision): Promise<LeaveRequest>;
  rejectLeave(id: string, d: LeaveDecision): Promise<LeaveRequest>;
  cancelLeave(id: string): Promise<LeaveRequest>;
  listLeaveBalances(employeeId: string, year: number):
    Promise<LeaveBalance[]>;
  listAttendance(q: AttendanceQuery): Promise<AttendanceRecord[]>;
  listPayRuns(): Promise<AppPayRun[]>;
  getPayRun(id: string): Promise<AppPayRun>;
  createPayRun(body: AppPayRunCreate, idempotencyKey: string):
    Promise<AppPayRun>;
  approvePayRun(id: string): Promise<AppPayRun>;
  voidPayRun(id: string): Promise<AppPayRun>;
  listPayslips(runId: string): Promise<AppPayslip[]>;
  getPayslip(id: string): Promise<AppPayslip>;
  createSif(runId: string): Promise<AppSifFile>;
  getSifFile(id: string): Promise<AppSifFile>;
  downloadSif(id: string): Promise<string>;
  listAuditEvents(q?: { before?: number; limit?: number }):
    Promise<AuditPage>;
  verifyAudit(): Promise<AuditVerifyResult>;
  listUsers(): Promise<UserRow[]>;
  inviteUser(r: InviteRequest): Promise<InviteResponse>;
}

export type ApiMethod = keyof ApiClient;

/** Where the token and company id come from (the session). */
export interface AuthSource {
  token(): string | null;
  companyId(): string | null;
}
