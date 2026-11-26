/**
 * Example values for the web app's mocks. Salary amounts use
 * "7777.77" and IBANs "AE070331234567890123456": the sentinels the
 * API's leak test greps for. All people and companies are invented.
 */
export const IDS = {
  company: "00000000-0000-4000-8000-0000000000c1",
  user: "00000000-0000-4000-8000-0000000000a1",
  employee: "00000000-0000-4000-8000-0000000000e1",
  manager: "00000000-0000-4000-8000-0000000000e2",
  department: "00000000-0000-4000-8000-0000000000d1",
  leaveType: "00000000-0000-4000-8000-0000000000f1",
  leaveRequest: "00000000-0000-4000-8000-0000000000f2",
  adjustment: "00000000-0000-4000-8000-0000000000f3",
  attendance: "00000000-0000-4000-8000-0000000000b1",
  payRun: "00000000-0000-4000-8000-000000000091",
  payslip: "00000000-0000-4000-8000-000000000092",
  sifFile: "00000000-0000-4000-8000-000000000093",
  audit: "00000000-0000-4000-8000-000000000094",
} as const;

export const SALARY_SENTINEL = "7777.77";
export const IBAN_SENTINEL = "AE070331234567890123456";
const AT = "2026-03-01T08:00:00Z";

const user = {
  id: IDS.user,
  email: "owner@example.com",
  displayName: "Sample Owner",
  mfaEnrolled: true,
};
const membership = {
  companyId: IDS.company,
  companyName: "Sample Trading LLC",
  role: "owner",
  employeeId: null,
};
const companyUser = {
  userId: IDS.user,
  email: "owner@example.com",
  displayName: "Sample Owner",
  role: "owner",
  employeeId: null,
  mfaEnrolled: true,
};
const company = {
  id: IDS.company,
  name: "Sample Trading LLC",
  nameAr: null,
  wps: { employerId: "0000000123456", bankRoutingCode: "802420101" },
};
const employee = {
  id: IDS.employee,
  number: "E-001",
  fullName: "Sample Employee",
  fullNameAr: null,
  email: "employee@example.com",
  departmentId: IDS.department,
  managerId: IDS.manager,
  jobTitle: "Accountant",
  nationality: "IN",
  workerClass: "expat-full-time",
  joiningDate: "2019-01-01",
  lastWorkingDate: null,
  status: "active",
  salary: [{ code: "basic", label: "Basic salary", labelAr: null,
    amount: SALARY_SENTINEL, sifBucket: "fixed" }],
  bank: { routingCode: "803320101", ibanLast4: "3456" },
  labourPersonId: "00000000000001",
  emiratesIdNumber: "784199012345671",
};
const department = {
  id: IDS.department,
  name: "Finance",
  nameAr: null,
  headEmployeeId: IDS.manager,
};
const leaveType = {
  id: IDS.leaveType,
  name: "Annual leave",
  nameAr: null,
  paid: true,
  annualDays: 30,
};
const leaveRequest = {
  id: IDS.leaveRequest,
  employeeId: IDS.employee,
  leaveTypeId: IDS.leaveType,
  startDate: "2026-03-02",
  endDate: "2026-03-06",
  days: 5,
  status: "pending",
  reason: null,
  decidedBy: null,
  decidedAt: null,
};
const balance = {
  leaveTypeId: IDS.leaveType,
  year: 2026,
  entitledDays: 30,
  adjustmentDays: 2,
  takenDays: 0,
  pendingDays: 5,
  remainingDays: 27,
  dayCountRule: "calendar-days-inclusive",
};
const attendance = {
  id: IDS.attendance,
  employeeId: IDS.employee,
  date: "2026-03-02",
  clockIn: "2026-03-01T20:30:00Z",
  clockOut: "2026-03-01T22:00:59Z",
  minutes: 90,
  source: "self",
  note: null,
};

export const PEOPLE_EXAMPLES: Record<string, unknown> = {
  Health: { status: "ok" },
  NoContent: null,
  ApiErrorBody: { error: { code: "NOT_FOUND", message: "Not found",
    requestId: "req-1" } },
  LoginResponse: { token: "sample-token", expiresAt: "2026-03-01T16:00:00Z",
    user, memberships: [membership] },
  Me: { user, memberships: [membership],
    session: { mfa: true, expiresAt: "2026-03-01T16:00:00Z" } },
  MfaEnrolResponse: { secret: "JBSWY3DPEHPK3PXP",
    otpauthUrl: "otpauth://totp/Payroll:owner%40example.com" +
      "?secret=JBSWY3DPEHPK3PXP&issuer=Payroll" },
  Company: company,
  CompanyUser: companyUser,
  CompanyUserList: { items: [companyUser] },
  InviteResponse: { setupToken: "sample-setup-token",
    expiresAt: "2026-03-04T08:00:00Z" },
  EmployeeView: employee,
  EmployeeList: { items: [employee] },
  BankDetails: { routingCode: "803320101", iban: IBAN_SENTINEL },
  Department: department,
  DepartmentList: { items: [department] },
  LeaveType: leaveType,
  LeaveTypeList: { items: [leaveType] },
  LeaveRequest: leaveRequest,
  LeaveRequestList: { items: [leaveRequest] },
  LeaveBalanceList: { items: [balance] },
  LeaveAdjustment: { id: IDS.adjustment, employeeId: IDS.employee,
    leaveTypeId: IDS.leaveType, year: 2026, days: 2,
    reason: "carried over", createdBy: IDS.user, createdAt: AT },
  AttendanceRecord: attendance,
  AttendanceRecordList: { items: [attendance] },
};
