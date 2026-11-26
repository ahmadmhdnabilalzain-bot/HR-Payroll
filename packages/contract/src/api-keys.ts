import { z } from "zod";
import { Id, listOf, Timestamp } from "./primitives";

export const ApiScope = z.enum(["employees:read", "employees:write",
  "leave:read", "leave:write", "attendance:read", "payroll:read",
  "expenses:read"]);
export type ApiScope = z.infer<typeof ApiScope>;

/**
 * Default deny: a route is callable with an API key only when its id
 * is here. Never MFA, approval-spine, channel, user or public routes,
 * salary, bank, pay-run creation or approval, SIF or audit routes.
 */
export const API_KEY_SCOPES: Readonly<Record<string, ApiScope>> = {
  getCompany: "employees:read",
  listEmployees: "employees:read",
  getEmployee: "employees:read",
  listDepartments: "employees:read",
  createEmployee: "employees:write",
  updateEmployee: "employees:write",
  createDepartment: "employees:write",
  updateDepartment: "employees:write",
  listLeaveTypes: "leave:read",
  listLeaveRequests: "leave:read",
  getLeaveBalances: "leave:read",
  createLeaveRequest: "leave:write",
  cancelLeaveRequest: "leave:write",
  listAttendance: "attendance:read",
  listPayRuns: "payroll:read",
  getPayRun: "payroll:read",
  listPayRunPayslips: "payroll:read",
  getPayslip: "payroll:read",
  listExpenseClaims: "expenses:read",
  getExpenseClaim: "expenses:read",
};

export const API_KEY_PREFIX = "hrk_";
/** Product default, not a limit of any provider. */
export const API_KEY_DEFAULT_RATE = 120;

const Scopes = z.array(ApiScope).min(1).max(7)
  .refine((l) => new Set(l).size === l.length, "scopes must be unique");

export const ApiKeyCreate = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: Scopes,
  rateLimitPerMinute: z.number().int().min(10).max(1200).optional(),
  expiresAt: Timestamp.optional(),
});
export type ApiKeyCreate = z.infer<typeof ApiKeyCreate>;

export const ApiKey = z.object({
  id: Id,
  name: z.string(),
  prefix: z.string().regex(/^hrk_[0-9a-f]{16}$/),
  scopes: z.array(ApiScope),
  rateLimitPerMinute: z.number().int(),
  status: z.enum(["active", "revoked"]),
  createdAt: Timestamp,
  expiresAt: Timestamp.nullable(),
  lastUsedAt: Timestamp.nullable(),
  rotatedAt: Timestamp.nullable(),
  previousValidUntil: Timestamp.nullable(),
});
export type ApiKey = z.infer<typeof ApiKey>;
export const ApiKeyList = listOf(ApiKey);
export const ApiKeyCreated = z.object({ key: ApiKey, secret: z.string() });

export const ApiKeyUpdate = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  rateLimitPerMinute: z.number().int().min(10).max(1200).optional(),
});
export type ApiKeyUpdate = z.infer<typeof ApiKeyUpdate>;
export const ApiKeyRotate = z.object({
  graceHours: z.number().int().min(0).max(72) });
