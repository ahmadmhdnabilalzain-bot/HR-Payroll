import type { Role } from "./contract";

export const PERMISSIONS = [
  "employees.read",
  "employees.bank",
  "leave.decide",
  "payroll.prepare",
  "payroll.approve",
  "wps.generate",
  "company.edit",
  "users.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Who may do what, from the contract's ROUTES (a test compares each
 * row with its route). The employee role has no app access in M1.
 */
const TABLE: Record<Permission, readonly Role[]> = {
  "employees.read": ["owner", "hr", "manager"],
  "employees.bank": ["owner", "hr"],
  "leave.decide": ["owner", "hr", "manager"],
  "payroll.prepare": ["owner", "hr"],
  "payroll.approve": ["owner"],
  "wps.generate": ["owner", "hr"],
  "company.edit": ["owner"],
  "users.manage": ["owner"],
  "audit.read": ["owner", "hr"],
};

export function can(role: Role, p: Permission): boolean {
  return TABLE[p].includes(role);
}
