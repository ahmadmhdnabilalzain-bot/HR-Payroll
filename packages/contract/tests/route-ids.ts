/** Plan 3's 50 route ids (literal, so a lost route fails a test). */
export const PLAN3_IDS: readonly string[] = [
  "signup", "login", "acceptInvite", "health", "logout", "getMe",
  "enrolMfa", "confirmMfa", "getCompany", "updateCompany", "listUsers",
  "changeUserRole", "inviteUser", "listEmployees", "getEmployee",
  "createEmployee", "updateEmployee", "putEmployeeSalary",
  "putEmployeeBank", "getEmployeeBank", "listDepartments",
  "createDepartment", "updateDepartment", "listLeaveTypes",
  "createLeaveType", "updateLeaveType", "listLeaveRequests",
  "createLeaveRequest", "cancelLeaveRequest", "approveLeaveRequest",
  "rejectLeaveRequest", "getLeaveBalances", "createLeaveAdjustment",
  "clockIn", "clockOut", "listAttendance", "correctAttendance",
  "listMyPayslips", "getPayslip", "createPayRun", "listPayRuns",
  "getPayRun", "listPayRunPayslips", "voidPayRun", "approvePayRun",
  "generateSif", "getSifFile", "downloadSifFile", "listAuditEvents",
  "verifyAuditChain",
];

/** Plan 6's 25 route ids. */
export const PLAN6_IDS: readonly string[] = [
  "approvalInbox", "approveStep", "rejectStep", "returnStep",
  "listApprovalChains", "putApprovalChain", "uploadReceipt",
  "getReceipt", "downloadReceipt", "listExpenseCategories",
  "createExpenseCategory", "updateExpenseCategory", "getExpensePolicy",
  "putExpensePolicy", "listExpenseClaims", "createExpenseClaim",
  "getExpenseClaim", "updateExpenseClaim", "submitExpenseClaim",
  "cancelExpenseClaim", "expenseSummary", "expenseVatRegister",
  "expenseAging", "expenseUnpaid", "expensePayouts",
];

/** Plan 13's public route ids (Tasks 4 to 10 append). */
export const PUBLIC_CHANNEL_IDS: readonly string[] = [
  "whatsAppHookVerify", "whatsAppHook", "inboundEmailHook",
  "getCalendarFeed", "ssoStart", "ssoCallback", "getOpenApi",
  "getDeveloperGuide",
];
