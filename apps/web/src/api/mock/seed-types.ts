import type {
  AppEmployee,
  AppPayRun,
  AppPayslip,
  AppSifFile,
  AttendanceRecord,
  AuditEvent,
  Company,
  Department,
  LeaveRequest,
  LeaveType,
  Role,
} from "../contract";

export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  mfaEnrolled: boolean;
  role: Role;
  employeeId: string | null;
}

/** The view plus what only the server knows: the full IBAN. */
export interface MockEmployee extends AppEmployee {
  iban: string | null;
}

export interface MockSif {
  file: AppSifFile;
  text: string;
}

/** Everything the mock holds; each mock instance owns its own copy. */
export interface MockSeed {
  company: Company;
  departments: Department[];
  employees: MockEmployee[];
  leaveTypes: LeaveType[];
  leave: LeaveRequest[];
  attendance: AttendanceRecord[];
  users: MockUser[];
  runs: AppPayRun[];
  payslips: AppPayslip[];
  sifs: MockSif[];
  audit: AuditEvent[];
}

/**
 * Deterministic RFC 9562 version-4 shaped ids: kind and number in the
 * last group, so a test can read which record an id names.
 */
export function uid(kind: number, n: number): string {
  const tail = (kind * 0x1000000 + n).toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${tail}`;
}

export const KIND = {
  company: 1, user: 2, employee: 3, department: 4, leaveType: 5,
  leave: 6, attendance: 7, run: 8, payslip: 9, sif: 10, audit: 11,
} as const;
