import type { Audience, Role } from "@payroll/contract";

/** Who is asking: their employee record, its department, their role. */
export interface AudienceMember {
  employeeId: string | null;
  departmentId: string | null;
  /** null for an employee with no user in the company. */
  role: Role | null;
}

/** True when all staff, or the employee, department or role is listed. */
export function inAudience(a: Audience, m: AudienceMember): boolean {
  if (a.allStaff) return true;
  if (m.employeeId !== null && a.employeeIds.includes(m.employeeId)) {
    return true;
  }
  if (m.departmentId !== null && a.departmentIds.includes(m.departmentId)) {
    return true;
  }
  return m.role !== null && a.roles.includes(m.role);
}
